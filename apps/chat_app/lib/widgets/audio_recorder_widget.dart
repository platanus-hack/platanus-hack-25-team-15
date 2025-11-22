import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/audio_service.dart';

class AudioRecorderWidget extends StatefulWidget {
  final Function(Uint8List?, Duration, String?) onRecordingComplete;
  final VoidCallback onCancel;

  const AudioRecorderWidget({
    super.key,
    required this.onRecordingComplete,
    required this.onCancel,
  });

  @override
  State<AudioRecorderWidget> createState() => _AudioRecorderWidgetState();
}

class _AudioRecorderWidgetState extends State<AudioRecorderWidget>
    with TickerProviderStateMixin {
  final _audioService = AudioService();
  Duration _recordingDuration = Duration.zero;
  Timer? _timer;

  late AnimationController _pulseController;
  late AnimationController _slideHintController;
  late AnimationController _cancelController;
  late Animation<double> _slideHintAnimation;

  double _dragOffset = 0;
  static const double _cancelThreshold = -120;
  bool _isCancelling = false;

  @override
  void initState() {
    super.initState();

    // Animación del pulso del indicador de grabación
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);

    // Animación de hint para deslizar
    _slideHintController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();

    _slideHintAnimation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _slideHintController, curve: Curves.easeInOut),
    );

    // Animación para cancelar
    _cancelController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );

    _startRecording();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pulseController.dispose();
    _slideHintController.dispose();
    _cancelController.dispose();
    super.dispose();
  }

  Future<void> _startRecording() async {
    try {
      await _audioService.startRecording();
      _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
        if (mounted) {
          setState(() {
            _recordingDuration = Duration(seconds: timer.tick);
          });
        } else {
          timer.cancel();
        }
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al iniciar grabación: $e')),
        );
        widget.onCancel();
      }
    }
  }

  Future<void> _stopRecording() async {
    _timer?.cancel();
    final result = await _audioService.stopRecording();
    // result = (bytes, duration, blobUrl)
    widget.onRecordingComplete(result.$1, _recordingDuration, result.$3);
  }

  Future<void> _cancelRecording() async {
    HapticFeedback.mediumImpact();
    _timer?.cancel();
    await _audioService.cancelRecording();
    widget.onCancel();
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final minutes = twoDigits(duration.inMinutes.remainder(60));
    final seconds = twoDigits(duration.inSeconds.remainder(60));
    return '$minutes:$seconds';
  }

  void _onHorizontalDragUpdate(DragUpdateDetails details) {
    setState(() {
      _dragOffset += details.delta.dx;
      if (_dragOffset > 0) _dragOffset = 0;

      final wasCancelling = _isCancelling;
      _isCancelling = _dragOffset < _cancelThreshold;

      // Vibrar cuando cruza el umbral
      if (_isCancelling && !wasCancelling) {
        HapticFeedback.lightImpact();
      }
    });
  }

  void _onHorizontalDragEnd(DragEndDetails details) {
    if (_isCancelling) {
      _cancelRecording();
    } else {
      setState(() {
        _dragOffset = 0;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final cancelProgress = (_dragOffset.abs() / _cancelThreshold.abs()).clamp(0.0, 1.0);
    final theme = Theme.of(context);

    return GestureDetector(
      onHorizontalDragUpdate: _onHorizontalDragUpdate,
      onHorizontalDragEnd: _onHorizontalDragEnd,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              Color.lerp(
                theme.colorScheme.surfaceContainerHighest,
                theme.colorScheme.error.withValues(alpha: 0.3),
                cancelProgress,
              )!,
              Color.lerp(
                theme.colorScheme.surfaceContainerHighest,
                theme.colorScheme.error.withValues(alpha: 0.1),
                cancelProgress,
              )!,
            ],
          ),
          borderRadius: BorderRadius.circular(28),
          border: Border.all(
            color: Color.lerp(
              theme.colorScheme.outline.withValues(alpha: 0.2),
              theme.colorScheme.error,
              cancelProgress,
            )!,
            width: 1,
          ),
        ),
        child: Row(
          children: [
            // Botón cancelar
            _buildCancelButton(theme, cancelProgress),

            const SizedBox(width: 12),

            // Indicador de grabación pulsante
            _buildRecordingIndicator(theme),

            const SizedBox(width: 12),

            // Duración
            _buildDurationText(theme),

            // Área de deslizar para cancelar
            Expanded(
              child: _buildSlideToCancel(theme, cancelProgress),
            ),

            // Botón enviar
            _buildSendButton(theme),
          ],
        ),
      ),
    );
  }

  Widget _buildCancelButton(ThemeData theme, double cancelProgress) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Color.lerp(
          theme.colorScheme.error.withValues(alpha: 0.1),
          theme.colorScheme.error,
          cancelProgress,
        ),
      ),
      child: IconButton(
        onPressed: _cancelRecording,
        icon: AnimatedRotation(
          turns: cancelProgress * 0.1,
          duration: const Duration(milliseconds: 150),
          child: Icon(
            _isCancelling ? Icons.close : Icons.delete_outline,
            color: Color.lerp(
              theme.colorScheme.error,
              theme.colorScheme.onError,
              cancelProgress,
            ),
          ),
        ),
        tooltip: 'Cancelar',
        visualDensity: VisualDensity.compact,
      ),
    );
  }

  Widget _buildRecordingIndicator(ThemeData theme) {
    return AnimatedBuilder(
      animation: _pulseController,
      builder: (context, child) {
        return Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: theme.colorScheme.error,
            boxShadow: [
              BoxShadow(
                color: theme.colorScheme.error.withValues(
                  alpha: 0.4 * _pulseController.value,
                ),
                blurRadius: 8 * _pulseController.value,
                spreadRadius: 2 * _pulseController.value,
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildDurationText(ThemeData theme) {
    return Text(
      _formatDuration(_recordingDuration),
      style: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        fontFeatures: const [FontFeature.tabularFigures()],
        color: theme.colorScheme.onSurface,
      ),
    );
  }

  Widget _buildSlideToCancel(ThemeData theme, double cancelProgress) {
    return Transform.translate(
      offset: Offset(_dragOffset * 0.3, 0),
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 150),
        opacity: _isCancelling ? 0.0 : 1.0 - (cancelProgress * 0.5),
        child: AnimatedBuilder(
          animation: _slideHintAnimation,
          builder: (context, child) {
            return Row(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Flechas animadas
                ...List.generate(3, (index) {
                  final delay = index * 0.2;
                  final animValue = ((_slideHintAnimation.value + delay) % 1.0);
                  final opacity = math.sin(animValue * math.pi);

                  return Opacity(
                    opacity: opacity.clamp(0.2, 1.0),
                    child: Transform.translate(
                      offset: Offset(-8 * (1 - animValue), 0),
                      child: Icon(
                        Icons.chevron_left,
                        size: 18,
                        color: theme.colorScheme.onSurfaceVariant.withValues(
                          alpha: 0.6,
                        ),
                      ),
                    ),
                  );
                }),

                const SizedBox(width: 4),

                Text(
                  'Desliza para cancelar',
                  style: TextStyle(
                    fontSize: 13,
                    color: theme.colorScheme.onSurfaceVariant.withValues(
                      alpha: 0.8,
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildSendButton(ThemeData theme) {
    return AnimatedScale(
      scale: _isCancelling ? 0.8 : 1.0,
      duration: const Duration(milliseconds: 150),
      child: Container(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              theme.colorScheme.primary,
              theme.colorScheme.primary.withValues(alpha: 0.8),
            ],
          ),
          boxShadow: [
            BoxShadow(
              color: theme.colorScheme.primary.withValues(alpha: 0.3),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: IconButton(
          onPressed: _isCancelling ? null : _stopRecording,
          icon: Icon(
            Icons.send_rounded,
            color: theme.colorScheme.onPrimary,
          ),
          tooltip: 'Enviar',
        ),
      ),
    );
  }
}
