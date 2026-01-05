import 'package:flutter/material.dart';

class RequestsPage extends StatelessWidget {
  const RequestsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // ================= REQUEST LIST =================
          Padding(
            padding: const EdgeInsets.only(top: 120, bottom: 120),
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                _requestCard(
                  context,
                  title: "Rahul Kumar, 32M",
                  badge: "URGENT",
                  badgeColor: Colors.red,
                  subtitle: "Apollo Hospital · 2.3 km · 12 min travel",
                  type: "B+",
                  units: "2 units",
                ),
                _requestCard(
                  context,
                  title: "Anjali Singh, 45F",
                  badge: "High Priority",
                  badgeColor: Colors.orange,
                  subtitle: "Max Hospital · 5.8 km · 30 min travel",
                  type: "Kidney",
                ),
                _requestCard(
                  context,
                  title: "Vikram Singh, 29M",
                  badge: "URGENT",
                  badgeColor: Colors.red,
                  subtitle: "Fortis Hospital · 4.1 km · 22 min travel",
                  type: "O-",
                  units: "1 unit",
                ),
                _requestCard(
                  context,
                  title: "Priya Sharma, 38F",
                  badge: "High Priority",
                  badgeColor: Colors.orange,
                  subtitle: "Medanta Hospital · 8.5 km · 45 min travel",
                  type: "Liver",
                ),
              ],
            ),
          ),

          // ================= HEADER =================
          Container(
            height: 110,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFFE63946), Color(0xFFFF6B6B)],
              ),
              borderRadius: BorderRadius.only(
                bottomLeft: Radius.circular(24),
                bottomRight: Radius.circular(24),
              ),
            ),
            alignment: Alignment.center,
            child: const Padding(
              padding: EdgeInsets.only(top: 40),
              child: Text(
                "Requests",
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),

          // ================= FLOATING + BUTTON =================
          Positioned(
            right: 20,
            bottom: 110,
            child: GestureDetector(
              onTap: () => _showRequestPopup(context),
              child: Container(
                width: 60,
                height: 60,
                decoration: const BoxDecoration(
                  color: Color(0xFFE63946),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.add, color: Colors.white, size: 30),
              ),
            ),
          ),

          // ================= BOTTOM BAR (STATIC) =================
          Positioned(
            bottom: 0,
            child: Container(
              height: 80,
              width: MediaQuery.of(context).size.width,
              color: const Color(0xFFF4B9C4),
            ),
          ),
        ],
      ),
    );
  }

  // ================= REQUEST CARD =================
  Widget _requestCard(
    BuildContext context, {
    required String title,
    required String badge,
    required Color badgeColor,
    required String subtitle,
    required String type,
    String? units,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(color: Colors.black12, blurRadius: 4),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: badgeColor,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  badge,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 6),
          Text(
            subtitle,
            style: const TextStyle(fontSize: 12, color: Colors.grey),
          ),

          const SizedBox(height: 12),

          // Type + Icons
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                units == null ? type : "$type · $units",
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                ),
              ),
              Row(
                children: [
                  _iconButton(context, Icons.chat),
                  const SizedBox(width: 6),
                  _iconButton(context, Icons.call),
                ],
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Buttons
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text("Request accepted"),
                        backgroundColor: Colors.green,
                      ),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE63946),
                      borderRadius: BorderRadius.circular(30),
                    ),
                    alignment: Alignment.center,
                    child: const Text(
                      "Accept Request",
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(30),
                    border: Border.all(color: Colors.grey.shade300),
                  ),
                  alignment: Alignment.center,
                  child: const Text("Share"),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ================= ICON BUTTON =================
  Widget _iconButton(BuildContext context, IconData icon) {
    return GestureDetector(
      onTap: () {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Feature coming soon")),
        );
      },
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: const Color(0xFFFEF6F6),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.red.shade200),
        ),
        child: Icon(icon, size: 16, color: Colors.red),
      ),
    );
  }
}

// ================= POPUP =================
void _showRequestPopup(BuildContext context) {
  String requestType = 'Blood';
  String? selectedItem;
  String priority = 'Medium';

  final bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
  final organs = ['Kidney', 'Liver', 'Heart', 'Lung', 'Eyes', 'Pancreas'];

  showDialog(
    context: context,
    barrierDismissible: false,
    builder: (context) {
      return StatefulBuilder(
        builder: (context, setState) {
          return AlertDialog(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
            title: const Text(
              "Create Request",
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // -------- REQUEST TYPE --------
                  DropdownButtonFormField<String>(
                    value: requestType,
                    decoration: const InputDecoration(
                      labelText: "Request Type",
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'Blood', child: Text('Blood')),
                      DropdownMenuItem(value: 'Organ', child: Text('Organ')),
                    ],
                    onChanged: (value) {
                      setState(() {
                        requestType = value!;
                        selectedItem = null;
                      });
                    },
                  ),

                  const SizedBox(height: 12),

                  // -------- BLOOD / ORGAN DROPDOWN --------
                  DropdownButtonFormField<String>(
                    value: selectedItem,
                    decoration: InputDecoration(
                      labelText:
                          requestType == 'Blood' ? 'Blood Group' : 'Organ',
                      border: const OutlineInputBorder(),
                    ),
                    items: (requestType == 'Blood'
                            ? bloodGroups
                            : organs)
                        .map(
                          (item) => DropdownMenuItem(
                            value: item,
                            child: Text(item),
                          ),
                        )
                        .toList(),
                    onChanged: (value) {
                      setState(() => selectedItem = value);
                    },
                  ),

                  const SizedBox(height: 12),

                  // -------- LOCATION --------
                  const TextField(
                    decoration: InputDecoration(
                      labelText: "Current Location / Address",
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.location_on),
                    ),
                  ),

                  const SizedBox(height: 12),

                  // -------- PHONE NUMBER --------
                  const TextField(
                    keyboardType: TextInputType.phone,
                    decoration: InputDecoration(
                      labelText: "Phone Number",
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.phone),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // -------- PRIORITY --------
                  const Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      "Priority",
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),

                  const SizedBox(height: 8),

                  Wrap(
                    spacing: 8,
                    children: ['Low', 'Medium', 'High', 'Urgent'].map((p) {
                      final isSelected = priority == p;
                      return ChoiceChip(
                        label: Text(p),
                        selected: isSelected,
                        selectedColor: p == 'Urgent'
                            ? Colors.red
                            : Colors.red.shade200,
                        labelStyle: TextStyle(
                          color: isSelected ? Colors.white : Colors.black,
                        ),
                        onSelected: (_) {
                          setState(() => priority = p);
                        },
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),

            // -------- ACTIONS --------
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text("Cancel"),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFE63946),
                ),
                onPressed: () {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text("Request submitted successfully"),
                      backgroundColor: Colors.green,
                    ),
                  );
                },
                child: const Text("Submit"),
              ),
            ],
          );
        },
      );
    },
  );
}
