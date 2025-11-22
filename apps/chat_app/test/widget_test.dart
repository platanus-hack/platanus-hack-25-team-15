import 'package:flutter_test/flutter_test.dart';

import 'package:chat_app/main.dart';

void main() {
  testWidgets('Chat app loads correctly', (WidgetTester tester) async {
    await tester.pumpWidget(const ChatApp());

    // Verify that the app loads with the welcome message
    expect(find.text('¡Bienvenido!'), findsOneWidget);
    expect(find.text('Asistente de Voz'), findsOneWidget);
  });
}
