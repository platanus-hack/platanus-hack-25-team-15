import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:file_picker/file_picker.dart';
import 'package:mime/mime.dart';
import '../services/audio_service.dart';
import 'audio_recorder_widget.dart';

class ChatInput extends StatefulWidget {
  final Function(String) onSendText;
  final Function(Uint8List, String, Duration?, String?) onSendAudio;

  const ChatInput({
    super.key,
    required this.onSendText,
    required this.onSendAudio,
  });

  @override
  State<ChatInput> createState() => _ChatInputState();
}

class _ChatInputState extends State<ChatInput> {
  final _textController = TextEditingController();
  final _focusNode = FocusNode();
  bool _isRecording = false;
  bool _hasText = false;

  @override
  void initState() {
    super.initState();
    _textController.addListener(() {
      setState(() {
        _hasText = _textController.text.trim().isNotEmpty;
      });
    });
  }

  @override
  void dispose() {
    _textController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _sendText() {
    final text = _textController.text.trim();
    if (text.isNotEmpty) {
      widget.onSendText(text);
      _textController.clear();
      _focusNode.requestFocus();
    }
  }

  Future<void> _pickAudioFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'wma'],
        withData: true,
      );

      if (result != null && result.files.isNotEmpty) {
        final file = result.files.first;
        if (file.bytes != null) {
          final mimeType = lookupMimeType(file.name);
          if (mimeType?.startsWith('audio/') ?? file.extension != null) {
            // Obtener duración del archivo de audio
            final duration = await AudioService().getAudioDuration(file.bytes!);
            widget.onSendAudio(file.bytes!, file.name, duration, null);
          } else {
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Por favor selecciona un archivo de audio válido'),
                ),
              );
            }
          }
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al seleccionar archivo: $e')),
        );
      }
    }
  }

  void _startRecording() {
    setState(() {
      _isRecording = true;
    });
  }

  void _onRecordingComplete(Uint8List? audioData, Duration duration, String? blobUrl) {
    setState(() {
      _isRecording = false;
    });
    if (audioData != null && audioData.isNotEmpty) {
      widget.onSendAudio(
        audioData,
        'recording_${DateTime.now().millisecondsSinceEpoch}.webm',
        duration,
        blobUrl,
      );
    }
  }

  void _onRecordingCancel() {
    setState(() {
      _isRecording = false;
    });
  }

  KeyEventResult _handleKeyEvent(FocusNode node, KeyEvent event) {
    if (event is KeyDownEvent) {
      final isEnter = event.logicalKey == LogicalKeyboardKey.enter ||
          event.logicalKey == LogicalKeyboardKey.numpadEnter;
      final isShiftPressed = HardwareKeyboard.instance.isShiftPressed;

      if (isEnter && !isShiftPressed) {
        _sendText();
        return KeyEventResult.handled;
      }
    }
    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    if (_isRecording) {
      return Padding(
        padding: const EdgeInsets.all(8.0),
        child: AudioRecorderWidget(
          onRecordingComplete: _onRecordingComplete,
          onCancel: _onRecordingCancel,
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            IconButton(
              onPressed: _pickAudioFile,
              icon: Icon(
                Icons.attach_file,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              tooltip: 'Adjuntar audio',
            ),
            Expanded(
              child: Container(
                constraints: const BoxConstraints(maxHeight: 120),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Focus(
                  onKeyEvent: _handleKeyEvent,
                  child: TextField(
                    controller: _textController,
                    focusNode: _focusNode,
                    maxLines: null,
                    textCapitalization: TextCapitalization.sentences,
                    textInputAction: TextInputAction.newline,
                    decoration: InputDecoration(
                      hintText: 'Escribe un mensaje...',
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                      hintStyle: TextStyle(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            _buildActionButton(),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButton() {
    if (_hasText) {
      return IconButton(
        onPressed: _sendText,
        style: IconButton.styleFrom(
          backgroundColor: Theme.of(context).colorScheme.primary,
          foregroundColor: Theme.of(context).colorScheme.onPrimary,
        ),
        icon: const Icon(Icons.send),
        tooltip: 'Enviar mensaje',
      );
    }

    return IconButton(
      onPressed: _startRecording,
      style: IconButton.styleFrom(
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Theme.of(context).colorScheme.onPrimary,
      ),
      icon: const Icon(Icons.mic),
      tooltip: 'Grabar audio',
    );
  }
}
