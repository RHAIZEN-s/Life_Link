import 'package:flutter/material.dart';

class RequestsPage extends StatefulWidget {
  const RequestsPage({super.key});

  @override
  State<RequestsPage> createState() => _RequestsPageState();
}

class _RequestsPageState extends State<RequestsPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Stores + added requests
  List<Map<String, String>> myRequests = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // ================= CONTENT =================
          Padding(
            padding: const EdgeInsets.only(top: 160),
            child: Column(
              children: [
                TabBar(
                  controller: _tabController,
                  labelColor: Colors.red,
                  unselectedLabelColor: Colors.grey,
                  indicatorColor: Colors.red,
                  tabs: const [
                    Tab(text: "All Requests"),
                    Tab(text: "My Requests"),
                  ],
                ),
                Expanded(
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      _allRequestsTab(context),
                      _myRequestsTab(),
                    ],
                  ),
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

          // ================= + BUTTON =================
          Positioned(
            right: 20,
            bottom: 20,
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

          // ================= BOTTOM BAR =================
          // Positioned(
          //   bottom: 0,
          //   child: Container(
          //     height: 80,
          //     width: MediaQuery.of(context).size.width,
          //     color: const Color(0xFFF4B9C4),
          //   ),
          // ),
        ],
      ),
    );
  }

  // ================= ALL REQUESTS =================
  Widget _allRequestsTab(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
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
      ],
    );
  }

  // ================= MY REQUESTS =================
  Widget _myRequestsTab() {
    if (myRequests.isEmpty) {
      return const Center(
        child: Text("No requests added yet"),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: myRequests.length,
      itemBuilder: (context, index) {
        final req = myRequests[index];
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
              Text(
                req['type']!,
                style: const TextStyle(
                    fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              Text(req['location']!),
              const SizedBox(height: 8),
              Chip(label: Text(req['priority']!)),
            ],
          ),
        );
      },
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
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title,
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w700)),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: badgeColor,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(badge,
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(subtitle,
              style: const TextStyle(fontSize: 12, color: Colors.grey)),
          const SizedBox(height: 12),
          Text(units == null ? type : "$type · $units",
              style:
                  const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
        ],
      ),
    );
  }

  // ================= POPUP =================
  void _showRequestPopup(BuildContext context) {
    String requestType = 'Blood';
    String? selectedItem;
    String priority = 'Medium';

    final bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
    final organs = ['Kidney', 'Liver', 'Heart', 'Lung', 'Eyes'];

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20)),
              title: const Text("Create Request"),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DropdownButtonFormField(
                    value: requestType,
                    items: const [
                      DropdownMenuItem(value: 'Blood', child: Text('Blood')),
                      DropdownMenuItem(value: 'Organ', child: Text('Organ')),
                    ],
                    onChanged: (v) {
                      setState(() {
                        requestType = v!;
                        selectedItem = null;
                      });
                    },
                    decoration:
                        const InputDecoration(labelText: "Request Type"),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField(
                    value: selectedItem,
                    items: (requestType == 'Blood' ? bloodGroups : organs)
                        .map((e) =>
                            DropdownMenuItem(value: e, child: Text(e)))
                        .toList(),
                    onChanged: (v) => setState(() => selectedItem = v),
                    decoration: InputDecoration(
                        labelText: requestType == 'Blood'
                            ? 'Blood Group'
                            : 'Organ'),
                  ),
                ],
              ),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text("Cancel")),
                ElevatedButton(
                  onPressed: () {
                    Navigator.pop(context);
                    this.setState(() {
                      myRequests.add({
                        'type': selectedItem!,
                        'priority': priority,
                        'location': 'User Location',
                      });
                      _tabController.index = 1;
                    });
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
}
