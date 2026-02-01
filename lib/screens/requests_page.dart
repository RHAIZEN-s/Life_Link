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
                    children: [_allRequestsTab(context), _myRequestsTab()],
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
      return const Center(child: Text("No requests added yet"));
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
            boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                req['patientName']!,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 6),
              Text(req['hospitalName']!),
              const SizedBox(height: 4),
              Text(req['location']!),
              const SizedBox(height: 4),
              Text(req['phoneNumber']!),
              const SizedBox(height: 8),
              Text(
                'Requested: ${req['type']!}',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFFE63946),
                ),
              ),
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
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
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
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
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
          Text(
            units == null ? type : "$type · $units",
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
          ),
        ],
      ),
    );
  }

  // ================= POPUP =================
  void _showRequestPopup(BuildContext context) {
    String requestType = 'Blood';
    String? selectedItem;
    String priority = 'Medium';

    final patientNameController = TextEditingController();
    final hospitalNameController = TextEditingController();
    final locationController = TextEditingController();
    final phoneNumberController = TextEditingController();

    String? patientNameError;
    String? hospitalNameError;
    String? locationError;
    String? phoneNumberError;
    String? selectionError;

    final bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
    final organs = ['Kidney', 'Liver', 'Heart', 'Lung', 'Eyes'];

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              title: const Text("Create Request"),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: patientNameController,
                      decoration: InputDecoration(
                        labelText: 'Patient Name *',
                        labelStyle: const TextStyle(color: Colors.black54),
                        hintText: 'Enter patient name',
                        border: const OutlineInputBorder(),
                        errorText: patientNameError,
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: hospitalNameController,
                      decoration: InputDecoration(
                        labelText: 'Hospital Name *',
                        labelStyle: const TextStyle(color: Colors.black54),
                        hintText: 'Enter hospital name',
                        border: const OutlineInputBorder(),
                        errorText: hospitalNameError,
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: locationController,
                      decoration: InputDecoration(
                        labelText: 'Location *',
                        labelStyle: const TextStyle(color: Colors.black54),
                        hintText: 'Enter location',
                        border: const OutlineInputBorder(),
                        errorText: locationError,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 16),
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.grey),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            "+91",
                            style: TextStyle(fontSize: 16),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: phoneNumberController,
                            keyboardType: TextInputType.phone,
                            maxLength: 10,
                            decoration: InputDecoration(
                              labelText: 'Phone Number *',
                              labelStyle: const TextStyle(color: Colors.black54),
                              hintText: 'Enter 10 digit number',
                              border: const OutlineInputBorder(),
                              counterText: "",
                              errorText: phoneNumberError,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
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
                          selectionError = null;
                        });
                      },
                      decoration: const InputDecoration(
                        labelText: 'Request Type *',
                        labelStyle: TextStyle(color: Colors.black54),
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField(
                      value: selectedItem,
                      items: (requestType == 'Blood' ? bloodGroups : organs)
                          .map((e) =>
                              DropdownMenuItem(value: e, child: Text(e)))
                          .toList(),
                      onChanged: (v) => setState(() {
                        selectedItem = v;
                        selectionError = null;
                      }),
                      decoration: InputDecoration(
                        labelText: requestType == 'Blood'
                            ? 'Blood Group *'
                            : 'Organ *',
                        labelStyle: const TextStyle(color: Colors.black54),
                        border: const OutlineInputBorder(),
                        errorText: selectionError,
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text("Cancel"),
                ),
                ElevatedButton(
                  onPressed: () {
                    bool hasError = false;
                    List<String> missingFields = [];

                    setState(() {
                      patientNameError = null;
                      hospitalNameError = null;
                      locationError = null;
                      phoneNumberError = null;
                      selectionError = null;

                      if (patientNameController.text.trim().isEmpty) {
                        patientNameError = 'Required';
                        missingFields.add('Patient Name');
                        hasError = true;
                      }

                      if (hospitalNameController.text.trim().isEmpty) {
                        hospitalNameError = 'Required';
                        missingFields.add('Hospital Name');
                        hasError = true;
                      }

                      if (locationController.text.trim().isEmpty) {
                        locationError = 'Required';
                        missingFields.add('Location');
                        hasError = true;
                      }

                      if (phoneNumberController.text.trim().isEmpty) {
                        phoneNumberError = 'Required';
                        missingFields.add('Phone Number');
                        hasError = true;
                      } else if (phoneNumberController.text.trim().length !=
                          10) {
                        phoneNumberError = 'Must be 10 digits';
                        missingFields.add('Phone Number (10 digits)');
                        hasError = true;
                      } else if (!RegExp(r'^[0-9]+$')
                          .hasMatch(phoneNumberController.text.trim())) {
                        phoneNumberError = 'Only digits allowed';
                        missingFields.add('Phone Number (digits only)');
                        hasError = true;
                      }

                      if (selectedItem == null) {
                        selectionError = 'Required';
                        missingFields.add(requestType == 'Blood'
                            ? 'Blood Group'
                            : 'Organ');
                        hasError = true;
                      }
                    });

                    if (hasError) {
                      // Show alert dialog with missing fields
                      showDialog(
                        context: context,
                        builder: (alertContext) => AlertDialog(
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          title: Row(
                            children: const [
                              Icon(Icons.error_outline, color: Colors.red, size: 28),
                              SizedBox(width: 8),
                              Text('Required Fields Missing'),
                            ],
                          ),
                          content: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Please fill in the following required fields:',
                                style: TextStyle(fontSize: 14),
                              ),
                              const SizedBox(height: 12),
                              ...missingFields.map((field) => Padding(
                                padding: const EdgeInsets.only(bottom: 6),
                                child: Row(
                                  children: [
                                    const Icon(Icons.arrow_right, size: 20, color: Colors.red),
                                    Expanded(
                                      child: Text(
                                        field,
                                        style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              )),
                            ],
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(alertContext),
                              style: TextButton.styleFrom(
                                foregroundColor: const Color(0xFFE63946),
                              ),
                              child: const Text('OK'),
                            ),
                          ],
                        ),
                      );
                      return;
                    }

                    // If no errors, proceed with submission
                    Navigator.pop(context);
                    this.setState(() {
                      myRequests.add({
                        'patientName': patientNameController.text.trim(),
                        'hospitalName': hospitalNameController.text.trim(),
                        'location': locationController.text.trim(),
                        'phoneNumber':
                            '+91 ${phoneNumberController.text.trim()}',
                        'type': selectedItem!,
                        'priority': priority,
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