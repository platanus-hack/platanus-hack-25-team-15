import 'dart:async';
import 'dart:js_interop';
import 'dart:typed_data';
import 'package:web/web.dart' as web;
import 'package:flutter/foundation.dart' show debugPrint;

enum WebPlayerState { stopped, playing, paused, completed }

/// Web Audio Player híbrido:
/// - Usa HTMLAudioElement para WebM/Opus (grabaciones del micrófono)
/// - Usa Web Audio API para otros formatos (MP3, WAV, etc.)
class WebAudioPlayer {
  final _stateController = StreamController<WebPlayerState>.broadcast();
  final _positionController = StreamController<Duration>.broadcast();
  final _durationController = StreamController<Duration>.broadcast();

  Timer? _positionTimer;

  // HTMLAudioElement para WebM/Opus
  web.HTMLAudioElement? _audioElement;
  String? _currentBlobUrl;
  bool _ownsBlob = false; // true si creamos el blob internamente

  // Web Audio API para otros formatos
  web.AudioContext? _audioContext;
  web.AudioBufferSourceNode? _sourceNode;
  web.AudioBuffer? _audioBuffer;
  double _startTime = 0;
  double _pauseOffset = 0;
  bool _isPausedWebAudio = false;

  bool _useWebAudioApi = false;

  Stream<WebPlayerState> get onPlayerStateChanged => _stateController.stream;
  Stream<Duration> get onPositionChanged => _positionController.stream;
  Stream<Duration> get onDurationChanged => _durationController.stream;

  WebPlayerState _state = WebPlayerState.stopped;
  WebPlayerState get state => _state;

  /// Reproduce audio desde bytes
  Future<void> playBytes(Uint8List bytes, String mimeType) async {
    debugPrint('WebAudioPlayer.playBytes: ${bytes.length} bytes, mimeType: $mimeType');

    await stop();

    // Para WebM/Opus usar HTMLAudioElement (mejor compatibilidad con grabaciones)
    if (mimeType.contains('webm') || mimeType.contains('opus')) {
      await _playWithHtmlAudio(bytes, mimeType);
    } else {
      // Para otros formatos usar Web Audio API
      await _playWithWebAudioApi(bytes);
    }
  }

  /// Reproduce desde un blob URL (para grabaciones cacheadas)
  Future<void> playBlobUrl(String blobUrl) async {
    debugPrint('WebAudioPlayer.playBlobUrl: $blobUrl');

    await stop();

    // Usar HTMLAudioElement directamente con el blob URL
    await _playBlobWithHtmlAudio(blobUrl, ownsBlob: false);
  }

  /// Reproducción con HTMLAudioElement (para WebM/Opus)
  Future<void> _playWithHtmlAudio(Uint8List bytes, String mimeType) async {
    _useWebAudioApi = false;

    // Crear blob URL
    final jsArray = bytes.toJS;
    final blob = web.Blob([jsArray].toJS, web.BlobPropertyBag(type: mimeType));
    _currentBlobUrl = web.URL.createObjectURL(blob);
    _ownsBlob = true;

    await _playBlobWithHtmlAudio(_currentBlobUrl!, ownsBlob: true);
  }

  Future<void> _playBlobWithHtmlAudio(String blobUrl, {required bool ownsBlob}) async {
    _useWebAudioApi = false;
    _ownsBlob = ownsBlob;

    _audioElement = web.HTMLAudioElement();
    _audioElement!.volume = 1.0;
    _audioElement!.preload = 'auto';

    // Agregar al DOM (requerido por algunos navegadores)
    _audioElement!.style.display = 'none';
    web.document.body?.appendChild(_audioElement!);

    final completer = Completer<void>();

    // Eventos
    _audioElement!.onCanPlay.listen((_) {
      debugPrint('WebAudioPlayer: canplay');
      if (!completer.isCompleted) {
        completer.complete();
      }
    });

    _audioElement!.onPlay.listen((_) {
      debugPrint('WebAudioPlayer: play event, currentTime: ${_audioElement?.currentTime}');
      _state = WebPlayerState.playing;
      _stateController.add(_state);
      _startPositionTimer();
    });

    _audioElement!.onPause.listen((_) {
      debugPrint('WebAudioPlayer: pause event, currentTime: ${_audioElement?.currentTime}');
      if (_state != WebPlayerState.completed && _state != WebPlayerState.stopped) {
        _state = WebPlayerState.paused;
        _stateController.add(_state);
      }
      _stopPositionTimer();
    });

    _audioElement!.onEnded.listen((_) {
      debugPrint('WebAudioPlayer: ended event, currentTime: ${_audioElement?.currentTime}');
      _state = WebPlayerState.completed;
      _stateController.add(_state);
      _stopPositionTimer();
      _positionController.add(Duration.zero);
    });

    _audioElement!.onLoadedMetadata.listen((_) {
      final dur = _audioElement!.duration;
      debugPrint('WebAudioPlayer: loadedmetadata, duration: $dur');
      if (!dur.isNaN && !dur.isInfinite && dur > 0) {
        _durationController.add(Duration(milliseconds: (dur * 1000).toInt()));
      }
    });

    _audioElement!.onTimeUpdate.listen((_) {
      final time = _audioElement!.currentTime;
      if (!time.isNaN) {
        _positionController.add(Duration(milliseconds: (time * 1000).toInt()));
      }
    });

    _audioElement!.onError.listen((e) {
      final error = _audioElement?.error;
      debugPrint('WebAudioPlayer: error - code: ${error?.code}, message: ${error?.message}');
    });

    // Asignar src y cargar
    _audioElement!.src = blobUrl;
    _audioElement!.load();

    try {
      // Esperar a que esté listo o timeout
      await completer.future.timeout(const Duration(seconds: 5), onTimeout: () {
        debugPrint('WebAudioPlayer: Timeout waiting for canplay, trying to play anyway');
      });

      // Asegurar que currentTime está en 0
      _audioElement!.currentTime = 0;

      await _audioElement!.play().toDart;
      debugPrint('WebAudioPlayer: HTMLAudioElement playing, currentTime after play: ${_audioElement?.currentTime}');
    } catch (e) {
      debugPrint('WebAudioPlayer: Error playing: $e');
      _state = WebPlayerState.stopped;
      _stateController.add(_state);
    }
  }

  /// Reproducción con Web Audio API (para MP3, WAV, etc.)
  Future<void> _playWithWebAudioApi(Uint8List bytes) async {
    _useWebAudioApi = true;

    try {
      _audioContext ??= web.AudioContext();

      if (_audioContext!.state == 'suspended') {
        debugPrint('WebAudioPlayer: Resuming suspended AudioContext');
        await _audioContext!.resume().toDart;
      }

      debugPrint('WebAudioPlayer: Decoding audio with Web Audio API...');
      final arrayBuffer = bytes.buffer.toJS;
      _audioBuffer = await _audioContext!.decodeAudioData(arrayBuffer).toDart;

      final audioDuration = _audioBuffer!.duration;
      debugPrint('WebAudioPlayer: Decoded, duration: ${audioDuration}s');

      _durationController.add(Duration(milliseconds: (audioDuration * 1000).toInt()));

      _sourceNode = _audioContext!.createBufferSource();
      _sourceNode!.buffer = _audioBuffer;
      _sourceNode!.connect(_audioContext!.destination);

      _sourceNode!.onended = ((web.Event event) {
        if (!_isPausedWebAudio) {
          debugPrint('WebAudioPlayer: Web Audio playback ended');
          _state = WebPlayerState.completed;
          _stateController.add(_state);
          _stopPositionTimer();
          _positionController.add(Duration.zero);
          _pauseOffset = 0;
        }
      }).toJS;

      _startTime = _audioContext!.currentTime;
      _pauseOffset = 0;
      _sourceNode!.start(0, 0);
      _isPausedWebAudio = false;

      _state = WebPlayerState.playing;
      _stateController.add(_state);
      _startPositionTimer();

      debugPrint('WebAudioPlayer: Web Audio API playing');
    } catch (e) {
      debugPrint('WebAudioPlayer: Web Audio API error: $e');
      _state = WebPlayerState.stopped;
      _stateController.add(_state);
      rethrow;
    }
  }

  Future<void> pause() async {
    if (_useWebAudioApi) {
      if (_state != WebPlayerState.playing || _sourceNode == null) return;

      _isPausedWebAudio = true;
      _pauseOffset += _audioContext!.currentTime - _startTime;

      try {
        _sourceNode!.stop();
      } catch (e) {
        // ignore
      }
      _sourceNode = null;

      _state = WebPlayerState.paused;
      _stateController.add(_state);
      _stopPositionTimer();
    } else {
      _audioElement?.pause();
    }
  }

  Future<void> resume() async {
    if (_useWebAudioApi) {
      if (_state != WebPlayerState.paused || _audioBuffer == null) return;

      try {
        _sourceNode = _audioContext!.createBufferSource();
        _sourceNode!.buffer = _audioBuffer;
        _sourceNode!.connect(_audioContext!.destination);

        _sourceNode!.onended = ((web.Event event) {
          if (!_isPausedWebAudio) {
            _state = WebPlayerState.completed;
            _stateController.add(_state);
            _stopPositionTimer();
            _positionController.add(Duration.zero);
            _pauseOffset = 0;
          }
        }).toJS;

        _startTime = _audioContext!.currentTime;
        _sourceNode!.start(0, _pauseOffset);
        _isPausedWebAudio = false;

        _state = WebPlayerState.playing;
        _stateController.add(_state);
        _startPositionTimer();
      } catch (e) {
        debugPrint('WebAudioPlayer: Resume error: $e');
      }
    } else {
      try {
        await _audioElement?.play().toDart;
      } catch (e) {
        debugPrint('WebAudioPlayer: Resume error: $e');
      }
    }
  }

  Future<void> stop() async {
    _stopPositionTimer();

    // Limpiar HTMLAudioElement
    if (_audioElement != null) {
      _audioElement!.pause();
      _audioElement!.src = '';
      _audioElement!.remove(); // Remover del DOM
      _audioElement = null;
    }

    // Revocar blob URL solo si lo creamos nosotros
    if (_ownsBlob && _currentBlobUrl != null) {
      web.URL.revokeObjectURL(_currentBlobUrl!);
    }
    _currentBlobUrl = null;
    _ownsBlob = false;

    // Limpiar Web Audio API
    if (_sourceNode != null) {
      try {
        _sourceNode!.stop();
      } catch (e) {
        // ignore
      }
      _sourceNode = null;
    }
    _audioBuffer = null;
    _pauseOffset = 0;
    _isPausedWebAudio = false;

    _state = WebPlayerState.stopped;
    _stateController.add(_state);
  }

  Future<void> seek(Duration position) async {
    if (_useWebAudioApi) {
      if (_audioBuffer == null) return;

      final wasPlaying = _state == WebPlayerState.playing;

      if (wasPlaying) {
        _isPausedWebAudio = true;
        try {
          _sourceNode?.stop();
        } catch (e) {
          // ignore
        }
        _sourceNode = null;
      }

      _pauseOffset = position.inMilliseconds / 1000.0;

      if (wasPlaying) {
        _state = WebPlayerState.paused;
        await resume();
      }
    } else {
      if (_audioElement != null) {
        _audioElement!.currentTime = position.inMilliseconds / 1000.0;
      }
    }
  }

  Duration get position {
    if (_useWebAudioApi) {
      if (_state == WebPlayerState.playing && _audioContext != null) {
        final elapsed = _pauseOffset + (_audioContext!.currentTime - _startTime);
        return Duration(milliseconds: (elapsed * 1000).toInt());
      }
      if (_state == WebPlayerState.paused) {
        return Duration(milliseconds: (_pauseOffset * 1000).toInt());
      }
    } else {
      if (_audioElement != null) {
        final time = _audioElement!.currentTime;
        if (!time.isNaN) {
          return Duration(milliseconds: (time * 1000).toInt());
        }
      }
    }
    return Duration.zero;
  }

  Duration get duration {
    if (_useWebAudioApi && _audioBuffer != null) {
      return Duration(milliseconds: (_audioBuffer!.duration * 1000).toInt());
    }
    if (_audioElement != null) {
      final dur = _audioElement!.duration;
      if (!dur.isNaN && !dur.isInfinite) {
        return Duration(milliseconds: (dur * 1000).toInt());
      }
    }
    return Duration.zero;
  }

  void _startPositionTimer() {
    _stopPositionTimer();
    _positionTimer = Timer.periodic(const Duration(milliseconds: 50), (_) {
      if (_state == WebPlayerState.playing) {
        _positionController.add(position);
      }
    });
  }

  void _stopPositionTimer() {
    _positionTimer?.cancel();
    _positionTimer = null;
  }

  void dispose() {
    _stopPositionTimer();
    _audioElement?.pause();
    _audioElement?.remove();
    _audioElement = null;
    if (_ownsBlob && _currentBlobUrl != null) {
      web.URL.revokeObjectURL(_currentBlobUrl!);
    }
    try {
      _sourceNode?.stop();
    } catch (e) {
      // ignore
    }
    _sourceNode = null;
    _audioBuffer = null;
    _audioContext?.close();
    _audioContext = null;
    _stateController.close();
    _positionController.close();
    _durationController.close();
  }
}
