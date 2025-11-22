import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:uuid/uuid.dart';
import '../models/message.dart';

class ChatService {
  static final ChatService _instance = ChatService._internal();
  factory ChatService() => _instance;
  ChatService._internal();

  final List<Message> _messages = [];
  final _uuid = const Uuid();

  String? _apiBaseUrl;

  List<Message> get messages => List.unmodifiable(_messages);

  void setApiUrl(String url) {
    _apiBaseUrl = url;
  }

  Future<Message> sendTextMessage(String text) async {
    final message = Message(
      id: _uuid.v4(),
      type: MessageType.text,
      text: text,
      timestamp: DateTime.now(),
      status: MessageStatus.sending,
    );

    _messages.add(message);

    try {
      await _sendToApi(message);
      message.status = MessageStatus.sent;
    } catch (e) {
      message.status = MessageStatus.error;
    }

    return message;
  }

  Future<Message> sendAudioMessage({
    required Uint8List audioData,
    required String fileName,
    Duration? duration,
  }) async {
    final message = Message(
      id: _uuid.v4(),
      type: MessageType.audio,
      audioData: audioData,
      audioFileName: fileName,
      audioDuration: duration,
      timestamp: DateTime.now(),
      status: MessageStatus.sending,
    );

    _messages.add(message);

    try {
      await _sendToApi(message);
      message.status = MessageStatus.sent;
    } catch (e) {
      message.status = MessageStatus.error;
    }

    return message;
  }

  Future<void> _sendToApi(Message message) async {
    // Construir el payload
    final payload = {
      'id': message.id,
      'type': message.type.name,
      'text': message.text,
      'audioFileName': message.audioFileName,
      'audioDuration': message.audioDuration?.inMilliseconds,
      'audioBase64': message.audioData != null
          ? base64Encode(message.audioData!)
          : null,
      'audioSize': message.audioData?.length,
      'timestamp': message.timestamp.toIso8601String(),
    };

    // Imprimir el request en consola
    debugPrint('═══════════════════════════════════════════');
    debugPrint('📤 API REQUEST');
    debugPrint('═══════════════════════════════════════════');
    debugPrint('URL: ${_apiBaseUrl ?? "No configurada"}');
    debugPrint('Payload:');

    // Imprimir JSON formateado (sin el audio base64 completo para legibilidad)
    final payloadForLog = Map<String, dynamic>.from(payload);
    if (payloadForLog['audioBase64'] != null) {
      final audioBase64 = payloadForLog['audioBase64'] as String;
      payloadForLog['audioBase64'] = '${audioBase64.substring(0, 50)}... (${audioBase64.length} chars)';
    }
    const encoder = JsonEncoder.withIndent('  ');
    debugPrint(encoder.convert(payloadForLog));
    debugPrint('═══════════════════════════════════════════');

    // Simular delay de red
    await Future.delayed(const Duration(milliseconds: 500));

    if (_apiBaseUrl == null) {
      // API no configurada, solo guardamos en memoria
      return;
    }

    // TODO: Implementar llamada real al API cuando esté disponible
  }

  Future<void> retryMessage(String messageId) async {
    final index = _messages.indexWhere((m) => m.id == messageId);
    if (index == -1) return;

    final message = _messages[index];
    message.status = MessageStatus.sending;

    try {
      await _sendToApi(message);
      message.status = MessageStatus.sent;
    } catch (e) {
      message.status = MessageStatus.error;
    }
  }

  void clearMessages() {
    _messages.clear();
  }
}
