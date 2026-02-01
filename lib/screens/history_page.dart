import 'package:flutter/material.dart';

class HistoryPage extends StatelessWidget {
  final List<Map<String, dynamic>> accepted;
  final List<Map<String, dynamic>> rejected;

  const HistoryPage({
    super.key,
    required this.accepted,
    required this.rejected,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Request History"),
        backgroundColor: const Color(0xFFE63946),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (accepted.isNotEmpty) ...[
            const Text(
              "Accepted Requests",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            ...accepted.map((item) =>
                _historyCard(item, "ACCEPTED", Colors.green)),
            const SizedBox(height: 24),
          ],

          if (rejected.isNotEmpty) ...[
            const Text(
              "Rejected Requests",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            ...rejected.map((item) =>
                _historyCard(item, "REJECTED", Colors.red)),
          ],

          if (accepted.isEmpty && rejected.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.only(top: 40),
                child: Text("No request history yet"),
              ),
            ),
        ],
      ),
    );
  }

  Widget _historyCard(
      Map<String, dynamic> item, String status, Color color) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color,
          child: Text(
            item['bloodType'],
            style: const TextStyle(color: Colors.white),
          ),
        ),
        title: Text(item['hospital']),
        subtitle: Text("${item['location']} • ${item['units']}"),
        trailing: Text(
          status,
          style: TextStyle(
            color: color,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}
