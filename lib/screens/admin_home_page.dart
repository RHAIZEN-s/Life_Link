// lib/screens/admin_home_page.dart
import 'package:flutter/material.dart';

class AdminHomePage extends StatelessWidget {
  const AdminHomePage({super.key});

  // ---------- INLINE RESPONSIVE HELPERS ----------
  double _r(BuildContext context, double v) {
    double w = MediaQuery.of(context).size.width;
    if (w < 360) return v * 0.85;
    if (w < 400) return v * 0.93;
    return v; // normal phones
  }

  double _rf(BuildContext context, double v) {
    double w = MediaQuery.of(context).size.width;
    if (w < 360) return v * 0.82;
    if (w < 400) return v * 0.92;
    return v;
  }
  

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(title: const Text("Admin Home")),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(_r(context, 16)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _header(context),
            SizedBox(height: _r(context, 20)),
            _searchBar(context),
            SizedBox(height: _r(context, 25)),
            _overview(context),
            SizedBox(height: _r(context, 25)),
            _quickActions(context),
            SizedBox(height: _r(context, 25)),
            _recentActivity(context),
          ],
        ),
      ),
    );
  }

  // ---------------- HEADER ----------------
  Widget _header(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(_r(context, 18)),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
            colors: [Color(0xFF2B6CB0), Color(0xFF1E90FF)]),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          Container(
            width: _r(context, 72),
            height: _r(context, 72),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: Colors.white24,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              "AH",
              style: TextStyle(
                  fontSize: _rf(context, 24),
                  fontWeight: FontWeight.bold,
                  color: Colors.white),
            ),
          ),
          SizedBox(width: _r(context, 12)),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("Asha Hospital • Admin",
                  style: TextStyle(
                      fontSize: _rf(context, 18),
                      color: Colors.white,
                      fontWeight: FontWeight.w800)),
              Text(
                "Mumbai, Maharashtra",
                style: TextStyle(
                    fontSize: _rf(context, 12), color: Colors.white70),
              ),
            ],
          )
        ],
      ),
    );
  }

  // ---------------- SEARCH BAR ----------------
  Widget _searchBar(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: TextField(
            style: TextStyle(fontSize: _rf(context, 14)),
            decoration: InputDecoration(
              hintText: "Search users, donors or requests",
              contentPadding: EdgeInsets.symmetric(
                horizontal: _r(context, 14),
                vertical: _r(context, 12),
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ),
        SizedBox(width: _r(context, 8)),
        Container(
          padding: EdgeInsets.all(_r(context, 12)),
          decoration: BoxDecoration(
            color: const Color(0xFFE2ECF7),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text("Filter",
              style: TextStyle(fontSize: _rf(context, 14))),
        )
      ],
    );
  }

  // ---------------- OVERVIEW ----------------
  Widget _overview(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle(context, "Overview"),
        Row(
          children: const [
            StatBox(number: "1,254", label: "Active Donors"),
            StatBox(number: "48", label: "Pending"),
            StatBox(number: "22", label: "Urgent"),
          ],
        ),
      ],
    );
  }

  // ---------------- QUICK ACTIONS ----------------
  Widget _quickActions(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle(context, "Quick Actions"),
        Row(
          children: const [
            Expanded(child: ActionButton(text: "Manage Requests")),
            SizedBox(width: 12),
            Expanded(child: ActionButton(text: "Send Alert")),
          ],
        )
      ],
    );
  }

  // ---------------- RECENT ACTIVITY ----------------
  Widget _recentActivity(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: const [
        SizedBox(height: 10),
        ActivityItem(
            avatar: "DB",
            title: "Order #1142",
            subtitle: "Matched donor — Rahul Kumar",
            status: "Completed"),
        ActivityItem(
            avatar: "EV",
            title: "Blood Camp",
            subtitle: "Dec 5, 2025",
            status: "Scheduled"),
      ],
    );
  }

  // ---------------- SECTION TITLE ----------------
  Widget _sectionTitle(BuildContext context, String title) {
    return Padding(
      padding: EdgeInsets.only(bottom: _r(context, 12)),
      child: Text(
        title,
        style: TextStyle(
            fontSize: _rf(context, 16), fontWeight: FontWeight.w800),
      ),
    );
  }
}

// ---------------- REUSABLE WIDGETS ----------------

class StatBox extends StatelessWidget {
  final String number, label;

  const StatBox({super.key, required this.number, required this.label});

  @override
  Widget build(BuildContext context) {
    double w = MediaQuery.of(context).size.width;
    double r(double v) => w < 360 ? v * 0.85 : (w < 400 ? v * 0.93 : v);
    double rf(double v) => w < 360 ? v * 0.82 : (w < 400 ? v * 0.92 : v);

    return Expanded(
      child: Container(
        margin: EdgeInsets.only(right: r(8)),
        padding: EdgeInsets.all(r(12)),
        decoration: BoxDecoration(
          color: const Color(0x0D1E90FF),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Text(number,
                style: TextStyle(
                    fontSize: rf(18), fontWeight: FontWeight.w800)),
            Text(label,
                style: TextStyle(fontSize: rf(12), color: Colors.black54)),
          ],
        ),
      ),
    );
  }
}

class ActionButton extends StatelessWidget {
  final String text;
  const ActionButton({super.key, required this.text});

  @override
  Widget build(BuildContext context) {
    double w = MediaQuery.of(context).size.width;
    double r(double v) => w < 360 ? v * 0.85 : (w < 400 ? v * 0.93 : v);
    double rf(double v) => w < 360 ? v * 0.82 : (w < 400 ? v * 0.92 : v);

    return Container(
      padding: EdgeInsets.symmetric(vertical: r(12)),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(text,
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: rf(14))),
    );
  }
}

class ActivityItem extends StatelessWidget {
  final String avatar, title, subtitle, status;

  const ActivityItem(
      {super.key,
      required this.avatar,
      required this.title,
      required this.subtitle,
      required this.status});

  @override
  Widget build(BuildContext context) {
    double w = MediaQuery.of(context).size.width;
    double r(double v) => w < 360 ? v * 0.85 : (w < 400 ? v * 0.93 : v);
    double rf(double v) => w < 360 ? v * 0.82 : (w < 400 ? v * 0.92 : v);

    return Container(
      margin: EdgeInsets.only(bottom: r(12)),
      padding: EdgeInsets.all(r(12)),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE0E6ED))),
      child: Row(
        children: [
          Container(
            width: r(44),
            height: r(44),
            decoration: BoxDecoration(
              color: const Color(0xFFE6EEFC),
              borderRadius: BorderRadius.circular(10),
            ),
            alignment: Alignment.center,
            child: Text(avatar,
                style: TextStyle(
                    fontSize: rf(14), fontWeight: FontWeight.bold)),
          ),
          SizedBox(width: r(10)),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: TextStyle(
                        fontSize: rf(14), fontWeight: FontWeight.w800)),
                Text(subtitle,
                    style:
                        TextStyle(fontSize: rf(12), color: Colors.black54)),
              ],
            ),
          ),
          Container(
            padding:
                EdgeInsets.symmetric(horizontal: r(10), vertical: r(6)),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F3F5),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(status,
                style: TextStyle(
                    fontSize: rf(12), fontWeight: FontWeight.bold)),
          )
        ],
      ),
    );
  }
}
