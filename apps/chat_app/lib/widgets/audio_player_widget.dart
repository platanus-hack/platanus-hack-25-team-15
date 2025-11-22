import 'dart:async';
import 'package:flutter/material.dart';
import '../models/message.dart';
import '../services/audio_service.dart';

class AudioPlayerWidget extends StatefulWidget {
  final Message message;

  const AudioPlayerWidget({super.key, required this.message});

  @override
  State<AudioPlayerWidget> createState() => _AudioPlayerWidgetState();
}

class _AudioPlayerWidgetState extends State<AudioPlayerWidget>
    with SingleTickerProviderStateMixin {
  final _audioService = AudioService();
  bool _isPlaying = false;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;
  StreamSubscription? _playerStateSubscription;
  StreamSubscription? _positionSubscription;
  StreamSubscription? _durationSubscription;

  late AnimationController _playButtonController;

  // Waveform data from actual audio
  late List<double> _waveformData;

  @override
  void initState() {
    super.initState();
    _duration = widget.message.audioDuration ?? const Duration(seconds: 1);

    // Generate waveform from actual audio data
    _waveformData = AudioService.generateWaveformFromAudio(
      widget.message.audioData,
      35,
    );

    _playButtonController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );

    _playerStateSubscription = _audioService.playerStateStream.listen((state) {
      if (!mounted) return;

      if (_audioService.currentlyPlayingId == widget.message.id) {
        setState(() {
          _isPlaying = state == PlayerState.playing;
          if (state == PlayerState.completed) {
            _position = Duration.zero;
            _playButtonController.reverse();
          }
        });

        if (_isPlaying) {
          _playButtonController.forward();
        } else {
          _playButtonController.reverse();
        }
      } else if (_isPlaying) {
        setState(() {
          _isPlaying = false;
          _position = Duration.zero;
        });
        _playButtonController.reverse();
      }
    });

    _positionSubscription = _audioService.positionStream.listen((position) {
      if (mounted && _audioService.currentlyPlayingId == widget.message.id) {
        setState(() {
          _position = position;
        });
      }
    });

    _durationSubscription = _audioService.durationStream.listen((duration) {
      if (mounted && _audioService.currentlyPlayingId == widget.message.id) {
        setState(() {
          if (duration.inMilliseconds > 0) {
            _duration = duration;
          }
        });
      }
    });
  }

  @override
  void dispose() {
    _playerStateSubscription?.cancel();
    _positionSubscription?.cancel();
    _durationSubscription?.cancel();
    _playButtonController.dispose();
    super.dispose();
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final minutes = twoDigits(duration.inMinutes.remainder(60));
    final seconds = twoDigits(duration.inSeconds.remainder(60));
    return '$minutes:$seconds';
  }

  Future<void> _togglePlay() async {
    if (widget.message.audioData == null || widget.message.audioData!.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Audio no disponible')),
        );
      }
      return;
    }

    await _audioService.playAudio(
      widget.message.id,
      widget.message.audioData!,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasAudio = widget.message.audioData != null &&
        widget.message.audioData!.isNotEmpty;
    final progress = _duration.inMilliseconds > 0
        ? (_position.inMilliseconds / _duration.inMilliseconds).clamp(0.0, 1.0)
        : 0.0;

    return Container(
      constraints: const BoxConstraints(minWidth: 220, maxWidth: 280),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Play/Pause button
          _buildPlayButton(theme, hasAudio),

          const SizedBox(width: 8),

          // Waveform and time
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Waveform visualization
                _buildWaveform(theme, progress, hasAudio),

                const SizedBox(height: 4),

                // Time display
                _buildTimeDisplay(theme),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPlayButton(ThemeData theme, bool hasAudio) {
    return GestureDetector(
      onTap: hasAudio ? _togglePlay : null,
      child: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: hasAudio
              ? theme.colorScheme.onPrimaryContainer
              : theme.colorScheme.onPrimaryContainer.withValues(alpha: 0.4),
        ),
        child: Center(
          child: AnimatedIcon(
            icon: AnimatedIcons.play_pause,
            progress: _playButtonController,
            color: theme.colorScheme.primaryContainer,
            size: 28,
          ),
        ),
      ),
    );
  }

  Widget _buildWaveform(ThemeData theme, double progress, bool hasAudio) {
    return GestureDetector(
      onTapDown: hasAudio ? (details) {
        final box = context.findRenderObject() as RenderBox?;
        if (box != null) {
          final localPosition = details.localPosition;
          final waveformWidth = box.size.width - 56; // Subtract play button width
          final seekProgress = (localPosition.dx / waveformWidth).clamp(0.0, 1.0);
          final seekPosition = Duration(
            milliseconds: (_duration.inMilliseconds * seekProgress).toInt(),
          );
          _audioService.seekTo(seekPosition);
        }
      } : null,
      child: SizedBox(
        height: 32,
        child: CustomPaint(
          painter: WaveformPainter(
            waveformData: _waveformData,
            progress: progress,
            activeColor: theme.colorScheme.onPrimaryContainer,
            inactiveColor: theme.colorScheme.onPrimaryContainer.withValues(alpha: 0.3),
            isEnabled: hasAudio,
          ),
          size: Size.infinite,
        ),
      ),
    );
  }

  Widget _buildTimeDisplay(ThemeData theme) {
    final displayDuration = _isPlaying ? _duration - _position : _duration;
    final isRecording = widget.message.audioFileName?.startsWith('recording_') ?? false;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // Current position / remaining time
        Text(
          _isPlaying ? '-${_formatDuration(displayDuration)}' : _formatDuration(_duration),
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: theme.colorScheme.onPrimaryContainer.withValues(alpha: 0.8),
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),

        // Audio type indicator
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isRecording ? Icons.mic : Icons.audio_file,
              size: 14,
              color: theme.colorScheme.onPrimaryContainer.withValues(alpha: 0.6),
            ),
          ],
        ),
      ],
    );
  }
}

class WaveformPainter extends CustomPainter {
  final List<double> waveformData;
  final double progress;
  final Color activeColor;
  final Color inactiveColor;
  final bool isEnabled;

  WaveformPainter({
    required this.waveformData,
    required this.progress,
    required this.activeColor,
    required this.inactiveColor,
    required this.isEnabled,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final barWidth = size.width / waveformData.length;
    final maxHeight = size.height * 0.9;
    final progressIndex = (progress * waveformData.length).floor();

    for (var i = 0; i < waveformData.length; i++) {
      final barHeight = maxHeight * waveformData[i];
      final x = i * barWidth + barWidth / 2;
      final y = (size.height - barHeight) / 2;

      final paint = Paint()
        ..color = isEnabled
            ? (i <= progressIndex ? activeColor : inactiveColor)
            : inactiveColor.withValues(alpha: 0.3)
        ..strokeWidth = barWidth * 0.6
        ..strokeCap = StrokeCap.round;

      canvas.drawLine(
        Offset(x, y),
        Offset(x, y + barHeight),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(WaveformPainter oldDelegate) {
    return oldDelegate.progress != progress ||
        oldDelegate.activeColor != activeColor ||
        oldDelegate.isEnabled != isEnabled;
  }
}
