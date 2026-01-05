import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class UserHomePage extends StatefulWidget {
  const UserHomePage({super.key});

  @override
  State<UserHomePage> createState() => _UserHomePageState();
}

class _UserHomePageState extends State<UserHomePage> {
  // ------------------ DYNAMIC USER DATA (Later from API / Local storage)
  final String userName = "Rahul Kumar";
  final String bloodType = "A+";
  final int donations = 5;
  final int points = 850;

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
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "🩸 LifeLink",
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              CircleAvatar(
                backgroundColor: Colors.white24,
                child: Icon(Icons.notifications, color: Colors.white),
              ),
            ],
          ),
          const SizedBox(height: 20),
          const Text(
            "Welcome back,",
            style: TextStyle(color: Colors.white70),
          ),
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
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
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
                  child: Text(
                    "Search",
                    style: TextStyle(color: Colors.grey),
                  ),
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
          _requestCard(
            bloodType: "A+",
            hospital: "Apollo Hospital",
            location: "Pune, Maharashtra",
            distance: "2.3 km",
            time: "15 min ago",
            units: "2 units",
            urgent: true,
            color: const Color(0xFFE63946),
          ),
          _requestCard(
            bloodType: "B+",
            hospital: "Ruby Hall Clinic",
            location: "Pune, Maharashtra",
            distance: "5.1 km",
            time: "1 hour ago",
            units: "1 unit",
            urgent: false,
            color: const Color(0xFF06D6A0),
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
                      color: Colors.white, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(hospital,
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                    Text(location,
                        style: const TextStyle(
                            color: Colors.grey, fontSize: 12)),
                  ],
                ),
              ),
              if (urgent)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.red,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    "URGENT",
                    style: TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.bold),
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
                backgroundColor: color,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () {},
              child: const Text("Respond to Request"),
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
          _campCard(
            date: "November 15, 2025 • 9:00 AM - 5:00 PM",
            title: "Community Health Center",
            location: "Shivajinagar, Pune",
            color: const Color(0xFF457B9D),
          ),
          _campCard(
            date: "November 20, 2025 • 10:00 AM - 4:00 PM",
            title: "City Hospital Blood Drive",
            location: "Andheri, Mumbai",
            color: const Color(0xFFE63946),
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
          Text(title,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold)),
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
        Text(title,
            style: const TextStyle(
                fontSize: 18, fontWeight: FontWeight.bold)),
        const Text(
          "See All →",
          style: TextStyle(color: Colors.red),
        ),
      ],
    );
  }
}
