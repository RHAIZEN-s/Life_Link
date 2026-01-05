import 'package:flutter/material.dart';

class SearchPage extends StatefulWidget {
  const SearchPage({super.key});

  @override
  State<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends State<SearchPage> {
  bool isOrganSelected = true;
  String selectedFilter = '';

  final organFilters = ['Kidney', 'Liver', 'Eyes', 'Marrow'];
  final bloodFilters = ['A+', 'B+', 'B-', 'O+', 'O-'];

  final organData = [
    {
      'name': "St. Mary's Hospital",
      'distance': 'Downtown • 2.5 km',
      'organs': ['Kidney', 'Eyes', 'Marrow'],
    },
    {
      'name': "City General",
      'distance': 'Downtown • 5.1 km',
      'organs': ['Liver', 'Heart'],
    },
    {
      'name': "St. Mary's Hospital",
      'distance': 'Downtown • 2.5 km',
      'organs': ['Kidney', 'Eyes'],
    },
  ];

  final bloodData = [
    {'name': 'John Michal', 'blood': 'B+', 'address': 'PA 19126'},
    {'name': 'John Michal', 'blood': 'O+', 'address': 'MO 63010'},
    {'name': 'John Michal', 'blood': 'B-', 'address': 'MA 02143'},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            _header(),
            _toggle(),
            _chips(),
            Expanded(child: _list()),
          ],
        ),
      ),
    );
  }

  // ---------------- HEADER ----------------

  Widget _header() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFFE63946), Color(0xFFFF6B6B)],
        ),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(24)),
      ),
      child: Column(
        children: [
          const Text(
            'Find Donors',
            style: TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(40),
            ),
            child: const Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Search Location...',
                style: TextStyle(color: Colors.grey),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ---------------- TOGGLE ----------------

  Widget _toggle() {
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(40),
          border: Border.all(color: const Color(0xFFF4B9C4)),
        ),
        child: Row(
          children: [
            _toggleBtn('Organ Donors', true),
            _toggleBtn('Blood Donors', false),
          ],
        ),
      ),
    );
  }

  Widget _toggleBtn(String text, bool isOrgan) {
    final active = isOrganSelected == isOrgan;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() {
            isOrganSelected = isOrgan;
            selectedFilter = '';
          });
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: active ? const Color(0xFFF02745) : Colors.transparent,
            borderRadius: BorderRadius.circular(40),
            boxShadow: active
                ? [
                    BoxShadow(
                      color: Colors.red.withOpacity(0.3),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    )
                  ]
                : [],
          ),
          child: Text(
            text,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: active ? Colors.white : const Color(0xFFD71332),
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }

  // ---------------- FILTER CHIPS ----------------

  Widget _chips() {
    final data = isOrganSelected ? organFilters : bloodFilters;

    return SizedBox(
      height: 46,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        scrollDirection: Axis.horizontal,
        itemCount: data.length,
        itemBuilder: (_, i) {
          final selected = selectedFilter == data[i];
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () => setState(() => selectedFilter = data[i]),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: selected
                      ? const Color(0xFFC83333)
                      : const Color(0xFFC83333),
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.red.withOpacity(0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    )
                  ],
                ),
                child: Text(
                  data[i],
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  // ---------------- LIST ----------------

  Widget _list() {
    final list = isOrganSelected ? organData : bloodData;

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: list.length,
      itemBuilder: (_, i) {
        return isOrganSelected
            ? _organCard(list[i])
            : _bloodCard(list[i]);
      },
    );
  }

  Widget _organCard(Map data) {
    return _card(
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(data['distance'], style: const TextStyle(color: Colors.grey)),
          const SizedBox(height: 4),
          const Text(
            'Available Organs:',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
            children: data['organs']
                .map<Widget>(
                  (e) => Icon(Icons.favorite, color: Colors.red, size: 18),
                )
                .toList(),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _redBtn('Call\nHospital'),
              const SizedBox(width: 8),
              _outlineBtn('View\nDetails'),
            ],
          ),
        ],
      ),
      title: data['name'],
    );
  }

  Widget _bloodCard(Map data) {
    return _card(
      Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(data['name'],
                  style: const TextStyle(fontWeight: FontWeight.bold)),
              Text(data['address']),
            ],
          ),
          Text(
            data['blood'],
            style: const TextStyle(
              color: Colors.red,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
      title: data['name'],
    );
  }

  Widget _card(Widget child, {required String title}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFEDEE),
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: Colors.red.withOpacity(0.2),
            blurRadius: 16,
            offset: const Offset(0, 8),
          )
        ],
      ),
      child: child,
    );
  }

  Widget _redBtn(String text) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFFE63946), Color(0xFFD82B2B)],
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(text,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.white)),
      ),
    );
  }

  Widget _outlineBtn(String text) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          border: Border.all(color: const Color(0xFFDDE3EA)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(text,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Color(0xFF1D3557))),
      ),
    );
  }

}
