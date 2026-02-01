import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../services/local_user_service.dart';
import '../models/user_model.dart';
import 'requests_page.dart';
import 'history_page.dart';

class UserHomePage extends StatefulWidget {
  const UserHomePage({super.key});

  @override
  State<UserHomePage> createState() => _UserHomePageState();
}

class _UserHomePageState extends State<UserHomePage> {
  // Dynamic user data
  String userName = "";
  String bloodType = "";
  int donations = 0;
  int points = 0;
  String userEmail = "";
List<Map<String, dynamic>> acceptedRequests = [];
List<Map<String, dynamic>> rejectedRequests = [];

  List<Map<String, dynamic>> nearbyRequests = [];
  List<Map<String, dynamic>> upcomingCamps = [];

  // ------------------ MAP
  late GoogleMapController _mapController;

  final LatLng _currentLocation = const LatLng(18.5204, 73.8567); // Pune
  final Set<Marker> _markers = {
    const Marker(
      markerId: MarkerId('hospital1'),
      position: LatLng(18.5235, 73.8553),
      infoWindow: InfoWindow(title: 'Apollo Hospital'),
    ),
  };

  @override
  void initState() {
    super.initState();
    _loadUserAndHomeData();
  }

  Future<void> _loadUserAndHomeData() async {
    final email = await LocalUserService.getEmail();
    print(
      '[DEBUG] Loaded email from SharedPreferences: '
      '\u001b[33m$email\u001b[0m',
    );
    if (email != null && email.isNotEmpty) {
      print('[DEBUG] Calling _fetchHomeData with email: $email');
      userEmail = email;
      await _fetchHomeData(userEmail);
    } else {
      print('[DEBUG] Not calling _fetchHomeData: email missing');
    }
  }

  Future<void> _fetchHomeData(String email) async {
    print('[DEBUG] Entered _fetchHomeData with email: $email');
    if (email.isEmpty) {
      print('[DEBUG] Early return: email is empty');
      return;
    }
    final url = 'http://localhost:3000/home?email=$email';
    print(
      '[DEBUG] Fetching home data from: '
      '\u001b[36m$url\u001b[0m',
    );
    try {
      final response = await http.get(Uri.parse(url));
      print('[DEBUG] API response status: ${response.statusCode}');
      print('[DEBUG] API response body: ${response.body}');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          userName = data['userStats']['userName'] ?? "";
          bloodType = data['userStats']['bloodType'] ?? "";
          donations = data['userStats']['donations'] ?? 0;
          points = data['userStats']['points'] ?? 0;
          nearbyRequests = List<Map<String, dynamic>>.from(
            data['nearbyRequests'] ?? [],
          );
          upcomingCamps = List<Map<String, dynamic>>.from(
            data['upcomingCamps'] ?? [],
          );
        });
      }
    } catch (e) {
      print('[DEBUG] Error fetching home data: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: ListView(
        padding: EdgeInsets.zero,
        children: [
          _headerSection(),
          const SizedBox(height: 16),
          _statsRow(),
          const SizedBox(height: 20),
          _mapSection(),
          const SizedBox(height: 24),
          _nearbyRequestsSection(),
          const SizedBox(height: 24),
          _bloodCampsSection(),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  // ================= HEADER =================
  Widget _headerSection() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 50, 20, 20),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFFE63946), Color(0xFFFF6B6B)],
        ),
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(24),
          bottomRight: Radius.circular(24),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
Row(
  mainAxisAlignment: MainAxisAlignment.spaceBetween,
  children: [
    const Text(
      "🩸 LifeLink",
      style: TextStyle(
        color: Colors.white,
        fontSize: 24,
        fontWeight: FontWeight.bold,
      ),
    ),

    GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => HistoryPage(
  accepted: acceptedRequests,
  rejected: rejectedRequests,
),

          ),
        );
      },
      child: const CircleAvatar(
        backgroundColor: Colors.white24,
        child: Icon(Icons.notifications, color: Colors.white),
      ),
    ),
  ],
),

          const SizedBox(height: 20),
          const Text("Welcome back,", style: TextStyle(color: Colors.white70)),
          Text(
            userName,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  // ================= STATS =================
  Widget _statsRow() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          _statCard(donations.toString(), "Donations"),
          _statCard(points.toString(), "Points"),
          _statCard(bloodType, "Your Type"),
        ],
      ),
    );
  }

  Widget _statCard(String value, String label) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 6),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFF1F3F5),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }

  // ================= MAP =================
  Widget _mapSection() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Nearby Hospitals & Donors",
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: SizedBox(
              height: 180,
              child: GoogleMap(
                initialCameraPosition: CameraPosition(
                  target: _currentLocation,
                  zoom: 14,
                ),
                markers: _markers,
                onMapCreated: (controller) {
                  _mapController = controller;
                },
                myLocationEnabled: true,
                zoomControlsEnabled: false,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F3F5),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Row(
              children: [
                Expanded(
                  child: Text("Search", style: TextStyle(color: Colors.grey)),
                ),
                Icon(Icons.search),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ================= REQUESTS =================
  Widget _nearbyRequestsSection() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          _sectionHeader("Nearby Requests"),
          for (final req in nearbyRequests)
            _requestCard(
              bloodType: req['bloodType'] ?? '',
              hospital: req['hospital'] ?? '',
              location: req['location'] ?? '',
              distance: req['distance'] ?? '',
              time: req['timeAgo'] ?? '',
              units:
                  "${req['units'] ?? ''} unit${req['units'] == 1 ? '' : 's'}",
              urgent: req['urgent'] ?? false,
              color: (req['urgent'] ?? false)
                  ? const Color(0xFFE63946)
                  : const Color(0xFF06D6A0),
            ),
        ],
      ),
    );
  }

  Widget _requestCard({
    required String bloodType,
    required String hospital,
    required String location,
    required String distance,
    required String time,
    required String units,
    required bool urgent,
    required Color color,
  }) {
    return Container(
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8F9FA),
        borderRadius: BorderRadius.circular(16),
        border: Border(left: BorderSide(color: color, width: 4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                height: 48,
                width: 48,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: Text(
                  bloodType,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      hospital,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    Text(
                      location,
                      style: const TextStyle(color: Colors.grey, fontSize: 12),
                    ),
                  ],
                ),
              ),
              if (urgent)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.red,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    "URGENT",
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Text("📍 $distance"),
              const SizedBox(width: 12),
              Text("⏱ $time"),
              const SizedBox(width: 12),
              Text("👥 $units"),
            ],
          ),
          const SizedBox(height: 12),
SizedBox(
  width: double.infinity,
  child: ElevatedButton(
    style: ElevatedButton.styleFrom(
      backgroundColor: urgent
          ? const Color(0xFFE63946) // red
          : const Color(0xFF2EC4B6), // green
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
      ),
    ),
    onPressed: () {
  _showRequestDialog(
    bloodType: bloodType,
    hospital: hospital,
    location: location,
    distance: distance,
    time: time,
    units: units,
    urgent: urgent,
  );
},

    child: const Text(
      "Respond to Request",
      style: TextStyle(
        color: Colors.white, // ✅ FORCE TEXT COLOR
        fontWeight: FontWeight.w600,
      ),
    ),
  ),
),


        ],
      ),
    );
  }

  // ================= BLOOD CAMPS =================
  Widget _bloodCampsSection() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          _sectionHeader("Upcoming Blood Camps"),
          for (final camp in upcomingCamps)
            _campCard(
              date: "${camp['date']} • ${camp['time']}",
              title: camp['title'] ?? '',
              location: camp['location'] ?? '',
              color: const Color(0xFF457B9D),
            ),
        ],
      ),
    );
  }

  Widget _campCard({
    required String date,
    required String title,
    required String location,
    required Color color,
  }) {
    return Container(
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [color, color.withOpacity(0.7)]),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(date, style: const TextStyle(color: Colors.white70)),
          const SizedBox(height: 6),
          Text(
            title,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 6),
          Text(location, style: const TextStyle(color: Colors.white70)),
          const SizedBox(height: 12),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: color,
            ),
            onPressed: () {},
            child: const Text("Register Now"),
          ),
        ],
      ),
    );
  }

  // ================= COMMON =================
Widget _sectionHeader(String title) {
  return Row(
    mainAxisAlignment: MainAxisAlignment.spaceBetween,
    children: [
      Text(
        title,
        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
      ),
      GestureDetector(
        onTap: () {
          if (title == "Nearby Requests") {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => const RequestsPage(),
              ),
            );
          }
        },
        child: const Text(
          "See All →",
          style: TextStyle(
            color: Colors.red,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    ],
  );
}
void _showRequestDialog({
  required String bloodType,
  required String hospital,
  required String location,
  required String distance,
  required String time,
  required String units,
  required bool urgent,
}) {
  showDialog(
    context: context,
    builder: (_) {
      return AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text("Request Details"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("🩸 Blood Type: $bloodType"),
            Text("🏥 Hospital: $hospital"),
            Text("📍 Location: $location"),
            Text("📏 Distance: $distance"),
            Text("⏱ Time: $time"),
            Text("👥 Units: $units"),
            if (urgent)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text(
                  "URGENT",
                  style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold),
                ),
              ),
          ],
        ),
actions: [
  TextButton(
    onPressed: () {
      setState(() {
        rejectedRequests.add({
          "bloodType": bloodType,
          "hospital": hospital,
          "location": location,
          "units": units,
          "time": time,
        });
      });
      Navigator.pop(context);
    },
    child: const Text(
      "Reject",
      style: TextStyle(color: Colors.white),
    ),
  ),
  ElevatedButton(
    style: ElevatedButton.styleFrom(
      backgroundColor: const Color(0xFFE63946),
    ),
    onPressed: () {
      setState(() {
        acceptedRequests.add({
          "bloodType": bloodType,
          "hospital": hospital,
          "location": location,
          "units": units,
          "time": time,
        });
      });
      Navigator.pop(context);
    },
    child: const Text("Accept"),
  ),
],

      );
    },
  );
}

}
