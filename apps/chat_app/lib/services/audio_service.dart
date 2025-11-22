import 'dart:async';
import 'dart:js_interop';
import 'dart:typed_data';
import 'package:record/record.dart';
import 'package:flutter/foundation.dart' show kIsWeb, debugPrint;
import 'package:web/web.dart' as web;
import 'web_audio_player.dart';

enum PlayerState { stopped, playing, paused, completed }

class AudioService {
  static final AudioService _instance = AudioService._internal();
  factory AudioService() => _instance;
  AudioService._internal() {
    _setupPlayerListeners();
  }

  final AudioRecorder _recorder = AudioRecorder();
  final WebAudioPlayer _webPlayer = WebAudioPlayer();

  bool _isRecording = false;
  bool _isPlaying = false;
  bool _isPaused = false;
  String? _currentlyPlayingId;
  DateTime? _recordingStartTime;

  bool get isRecording => _isRecording;
  bool get isPlaying => _isPlaying;
  String? get currentlyPlayingId => _currentlyPlayingId;

  final _stateController = StreamController<PlayerState>.broadcast();
  Stream<PlayerState> get playerStateStream => _stateController.stream;
  Stream<Duration> get positionStream => _webPlayer.onPositionChanged;
  Stream<Duration> get durationStream => _webPlayer.onDurationChanged;

  void _setupPlayerListeners() {
    _webPlayer.onPlayerStateChanged.listen((state) {
      switch (state) {
        case WebPlayerState.playing:
          _isPlaying = true;
          _isPaused = false;
          _stateController.add(PlayerState.playing);
          break;
        case WebPlayerState.paused:
          _isPlaying = false;
          _isPaused = true;
          _stateController.add(PlayerState.paused);
          break;
        case WebPlayerState.completed:
          _isPlaying = false;
          _isPaused = false;
          _currentlyPlayingId = null;
          _stateController.add(PlayerState.completed);
          break;
        case WebPlayerState.stopped:
          _isPlaying = false;
          _isPaused = false;
          _stateController.add(PlayerState.stopped);
          break;
      }
    });
  }

  Future<bool> hasPermission() async {
    return await _recorder.hasPermission();
  }

  Future<void> startRecording() async {
    if (_isRecording) return;

    final hasPermission = await _recorder.hasPermission();
    if (!hasPermission) {
      throw Exception('Permiso de micrófono no concedido');
    }

    if (kIsWeb) {
      await _recorder.start(
        const RecordConfig(
          encoder: AudioEncoder.opus,
          sampleRate: 16000,
          numChannels: 1,
        ),
        path: '',
      );
    } else {
      await _recorder.start(
        const RecordConfig(
          encoder: AudioEncoder.aacLc,
          sampleRate: 44100,
          numChannels: 1,
        ),
        path: '',
      );
    }

    _isRecording = true;
    _recordingStartTime = DateTime.now();
  }

  /// Almacena el blob URL original para reproducción directa
  final Map<String, String> _blobUrlCache = {};

  Future<(Uint8List?, Duration?, String?)> stopRecording() async {
    if (!_isRecording) return (null, null, null);

    final path = await _recorder.stop();
    _isRecording = false;

    Duration? duration;
    if (_recordingStartTime != null) {
      duration = DateTime.now().difference(_recordingStartTime!);
      _recordingStartTime = null;
    }

    if (path != null && path.isNotEmpty) {
      debugPrint('Recording stopped, path: $path');

      if (kIsWeb && path.startsWith('blob:')) {
        // Obtener los bytes REALES del blob URL
        try {
          final bytes = await _fetchBlobAsBytes(path);
          if (bytes != null && bytes.isNotEmpty) {
            debugPrint('Got ${bytes.length} real bytes from blob');
            // Retornar también el blob URL original para reproducción directa
            return (bytes, duration, path);
          }
        } catch (e) {
          debugPrint('Error fetching blob bytes: $e');
        }
      }

      // Fallback para no-web
      final pathBytes = Uint8List.fromList(path.codeUnits);
      return (pathBytes, duration, null);
    }

    return (null, duration, null);
  }

  /// Guarda el blob URL asociado a un mensaje para reproducción directa
  void cacheBlobUrl(String messageId, String blobUrl) {
    _blobUrlCache[messageId] = blobUrl;
    debugPrint('Cached blob URL for message $messageId');
  }

  /// Obtiene el blob URL cacheado para un mensaje
  String? getCachedBlobUrl(String messageId) {
    return _blobUrlCache[messageId];
  }

  /// Obtiene los bytes reales de un blob URL usando fetch
  Future<Uint8List?> _fetchBlobAsBytes(String blobUrl) async {
    try {
      final response = await web.window.fetch(blobUrl.toJS).toDart;
      final arrayBuffer = await response.arrayBuffer().toDart;
      final bytes = arrayBuffer.toDart.asUint8List();
      return bytes;
    } catch (e) {
      debugPrint('_fetchBlobAsBytes error: $e');
      return null;
    }
  }

  Future<void> cancelRecording() async {
    if (!_isRecording) return;
    await _recorder.stop();
    _isRecording = false;
    _recordingStartTime = null;
  }

  Duration? getRecordingDuration() {
    if (_recordingStartTime == null) return null;
    return DateTime.now().difference(_recordingStartTime!);
  }

  Future<void> playAudio(String messageId, Uint8List audioData) async {
    if (_currentlyPlayingId == messageId && _isPaused) {
      await resumeAudio();
      return;
    }

    if (_currentlyPlayingId == messageId && _isPlaying) {
      await pauseAudio();
      return;
    }

    if (_isPlaying || _isPaused) {
      await stopAudio();
    }

    _currentlyPlayingId = messageId;

    try {
      debugPrint('Playing audio, data length: ${audioData.length}');

      // Intentar usar el blob URL cacheado primero (mejor calidad/compatibilidad)
      final cachedBlobUrl = _blobUrlCache[messageId];
      if (cachedBlobUrl != null) {
        debugPrint('Using cached blob URL for playback: $cachedBlobUrl');
        await _webPlayer.playBlobUrl(cachedBlobUrl);
        return;
      }

      // Fallback: Detectar tipo MIME y reproducir como bytes
      String mimeType = _detectMimeType(audioData);
      debugPrint('Detected MIME type: $mimeType');

      await _webPlayer.playBytes(audioData, mimeType);
    } catch (e) {
      debugPrint('Error playing audio: $e');
      _currentlyPlayingId = null;
      _isPlaying = false;
    }
  }

  String _detectMimeType(Uint8List data) {
    if (data.length < 12) return 'audio/webm; codecs=opus';

    // WebM (starts with 0x1A 0x45 0xDF 0xA3)
    if (data[0] == 0x1A && data[1] == 0x45 && data[2] == 0xDF && data[3] == 0xA3) {
      return 'audio/webm; codecs=opus';
    }
    // OGG (starts with "OggS")
    if (data[0] == 0x4F && data[1] == 0x67 && data[2] == 0x67 && data[3] == 0x53) {
      return 'audio/ogg';
    }
    // MP3 with ID3 tag
    if (data[0] == 0x49 && data[1] == 0x44 && data[2] == 0x33) {
      return 'audio/mpeg';
    }
    // MP3 frame sync
    if (data[0] == 0xFF && (data[1] & 0xE0) == 0xE0) {
      return 'audio/mpeg';
    }
    // WAV (starts with "RIFF")
    if (data[0] == 0x52 && data[1] == 0x49 && data[2] == 0x46 && data[3] == 0x46) {
      return 'audio/wav';
    }
    // FLAC
    if (data[0] == 0x66 && data[1] == 0x4C && data[2] == 0x61 && data[3] == 0x43) {
      return 'audio/flac';
    }
    // M4A/AAC (starts with "ftyp" at offset 4)
    if (data.length > 8 && data[4] == 0x66 && data[5] == 0x74 && data[6] == 0x79 && data[7] == 0x70) {
      return 'audio/mp4';
    }

    // Default to webm with opus codec (most common for web recordings)
    return 'audio/webm; codecs=opus';
  }

  Future<void> pauseAudio() async {
    await _webPlayer.pause();
  }

  Future<void> resumeAudio() async {
    await _webPlayer.resume();
  }

  Future<void> stopAudio() async {
    await _webPlayer.stop();
    _currentlyPlayingId = null;
  }

  Future<void> seekTo(Duration position) async {
    await _webPlayer.seek(position);
  }

  /// Obtiene la duración de un archivo de audio
  Future<Duration?> getAudioDuration(Uint8List audioData) async {
    try {
      final mimeType = _detectMimeType(audioData);
      final blob = web.Blob(
        [audioData.toJS].toJS,
        web.BlobPropertyBag(type: mimeType),
      );
      final url = web.URL.createObjectURL(blob);

      final completer = Completer<Duration?>();
      final audio = web.HTMLAudioElement();

      audio.onloadedmetadata = ((web.Event event) {
        final duration = audio.duration;
        web.URL.revokeObjectURL(url);
        if (duration.isFinite && duration > 0) {
          completer.complete(Duration(milliseconds: (duration * 1000).toInt()));
        } else {
          completer.complete(null);
        }
      }).toJS;

      audio.onerror = ((web.Event event) {
        web.URL.revokeObjectURL(url);
        completer.complete(null);
      }).toJS;

      audio.src = url;
      audio.load();

      return await completer.future.timeout(
        const Duration(seconds: 5),
        onTimeout: () => null,
      );
    } catch (e) {
      debugPrint('Error getting audio duration: $e');
      return null;
    }
  }

  /// Genera waveform data de los bytes de audio reales
  static List<double> generateWaveformFromAudio(Uint8List? audioData, int bars) {
    if (audioData == null || audioData.length < 100) {
      return List.generate(bars, (i) => 0.3);
    }

    final List<double> waveform = [];

    // Saltar headers del archivo (primeros ~100 bytes suelen ser metadata)
    final dataStart = audioData.length > 500 ? 200 : 0;
    final dataLength = audioData.length - dataStart;
    final samplesPerBar = dataLength ~/ bars;

    if (samplesPerBar <= 0) {
      return List.generate(bars, (i) => 0.3);
    }

    for (var i = 0; i < bars; i++) {
      final start = dataStart + (i * samplesPerBar);
      final end = (start + samplesPerBar).clamp(0, audioData.length);

      if (start >= audioData.length) {
        waveform.add(0.3);
        continue;
      }

      double sumSquares = 0;
      int count = 0;
      for (var j = start; j < end && j < audioData.length; j++) {
        final sample = (audioData[j] - 128).toDouble();
        sumSquares += sample * sample;
        count++;
      }

      if (count == 0) {
        waveform.add(0.3);
        continue;
      }

      final rms = (sumSquares / count);
      final normalized = 0.15 + (rms / 16384) * 0.85;
      waveform.add(normalized.clamp(0.15, 1.0));
    }

    return waveform;
  }

  void dispose() {
    _recorder.dispose();
    _webPlayer.dispose();
    _stateController.close();
  }
}
