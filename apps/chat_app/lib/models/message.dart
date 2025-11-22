import 'dart:typed_data';

enum MessageType { text, audio }
enum MessageStatus { sending, sent, error }

class Message {
  final String id;
  final MessageType type;
  final String? text;
  final Uint8List? audioData;
  final String? audioFileName;
  final Duration? audioDuration;
  final DateTime timestamp;
  MessageStatus status;

  Message({
    required this.id,
    required this.type,
    this.text,
    this.audioData,
    this.audioFileName,
    this.audioDuration,
    required this.timestamp,
    this.status = MessageStatus.sending,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type.name,
      'text': text,
      'audioFileName': audioFileName,
      'audioDuration': audioDuration?.inMilliseconds,
      'timestamp': timestamp.toIso8601String(),
    };
  }

  bool get isText => type == MessageType.text;
  bool get isAudio => type == MessageType.audio;
}
