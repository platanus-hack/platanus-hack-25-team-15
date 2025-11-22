import 'dart:typed_data';
import 'package:flutter/material.dart';
import '../main.dart';
import '../models/message.dart';
import '../services/chat_service.dart';
import '../services/audio_service.dart';
import '../widgets/chat_input.dart';
import '../widgets/message_bubble.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _chatService = ChatService();
  final _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendTextMessage(String text) async {
    await _chatService.sendTextMessage(text);
    setState(() {});
    _scrollToBottom();
  }

  Future<void> _sendAudioMessage(
    Uint8List audioData,
    String fileName,
    Duration? duration,
    String? blobUrl,
  ) async {
    final message = await _chatService.sendAudioMessage(
      audioData: audioData,
      fileName: fileName,
      duration: duration,
    );
    // Cachear el blob URL para reproducción directa
    if (blobUrl != null) {
      AudioService().cacheBlobUrl(message.id, blobUrl);
    }
    setState(() {});
    _scrollToBottom();
  }

  Future<void> _retryMessage(String messageId) async {
    await _chatService.retryMessage(messageId);
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final messages = _chatService.messages;
    final isWideScreen = MediaQuery.of(context).size.width > 600;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Cogni+',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
        elevation: 1,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: IconButton(
              onPressed: () => ChatApp.of(context)?.toggleTheme(),
              icon: Icon(
                Theme.of(context).brightness == Brightness.dark
                    ? Icons.light_mode
                    : Icons.dark_mode,
              ),
              tooltip: 'Cambiar tema',
            ),
          ),
        ],
      ),
      body: Center(
        child: Container(
          constraints: BoxConstraints(
            maxWidth: isWideScreen ? 800 : double.infinity,
          ),
          margin: isWideScreen
              ? const EdgeInsets.symmetric(horizontal: 24, vertical: 16)
              : null,
          decoration: isWideScreen
              ? BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: Theme.of(context).colorScheme.outlineVariant,
                    width: 1,
                  ),
                )
              : null,
          clipBehavior: isWideScreen ? Clip.antiAlias : Clip.none,
          child: Column(
            children: [
              Expanded(
                child: messages.isEmpty
                    ? _buildEmptyState()
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        itemCount: messages.length,
                        itemBuilder: (context, index) {
                          final message = messages[index];
                          return MessageBubble(
                            message: message,
                            onRetry: message.status == MessageStatus.error
                                ? () => _retryMessage(message.id)
                                : null,
                          );
                        },
                      ),
              ),
              ChatInput(
                onSendText: _sendTextMessage,
                onSendAudio: _sendAudioMessage,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const SizedBox(height: 40),
            Icon(
              Icons.chat_bubble_outline,
              size: 80,
              color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 24),
            Text(
              '¡Bienvenido!',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Envía un mensaje de texto o audio para comenzar',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: 32),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              alignment: WrapAlignment.center,
              children: [
                _buildFeatureChip(Icons.text_fields, 'Texto'),
                _buildFeatureChip(Icons.mic, 'Grabar audio'),
                _buildFeatureChip(Icons.attach_file, 'Adjuntar audio'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFeatureChip(IconData icon, String label) {
    return Chip(
      avatar: Icon(icon, size: 18),
      label: Text(label),
      backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
    );
  }

  void _showSettingsDialog(BuildContext context) {
    final apiController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Configuración'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'URL del API',
              style: TextStyle(fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: apiController,
              decoration: const InputDecoration(
                hintText: 'https://api.example.com',
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Los mensajes se guardarán en memoria y se enviarán al API cuando esté configurado.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              _chatService.clearMessages();
              setState(() {});
              Navigator.of(context).pop();
            },
            child: Text(
              'Limpiar chat',
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () {
              if (apiController.text.isNotEmpty) {
                _chatService.setApiUrl(apiController.text);
              }
              Navigator.of(context).pop();
            },
            child: const Text('Guardar'),
          ),
        ],
      ),
    );
  }
}
