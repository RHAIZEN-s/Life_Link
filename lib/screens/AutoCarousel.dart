// lib/screens/AutoCarousel.dart
import 'dart:async';
import 'package:flutter/material.dart';

import 'Caraousel1.dart';
import 'Caraousel2.dart';
import 'Caraousel3.dart';
import 'Caraousel4.dart';

class AutoCarousel extends StatefulWidget {
  const AutoCarousel({super.key});

  @override
  State<AutoCarousel> createState() => _AutoCarouselState();
}

class _AutoCarouselState extends State<AutoCarousel>
    with WidgetsBindingObserver {
  final List<Widget> _pages = const [
    Caraousel1(),
    Caraousel2(),
    Caraousel3(),
    Caraousel4(),
  ];

  int _currentIndex = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _startTimer();
  }

  // ---------------- AUTO SCROLL ----------------
  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 2), (timer) {
      if (!mounted) return;

      setState(() {
        if (_currentIndex < _pages.length - 1) {
          _currentIndex++;
        } else {
          // Stop at last page
          _timer?.cancel();
        }
      });
    });
  }

  // ---------------- DOT TAP HANDLER ----------------
  void _onDotTapped(int index) {
    _timer?.cancel(); // Stop auto-scroll on manual interaction
    setState(() {
      _currentIndex = index;
    });
  }

  // ---------------- APP LIFECYCLE ----------------
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive) {
      _timer?.cancel();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    super.dispose();
  }

  // ---------------- DOT WIDGET ----------------
  Widget _dot({required bool isActive, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        margin: const EdgeInsets.symmetric(horizontal: 6),
        width: isActive ? 26 : 10,
        height: 10,
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFFC62C2C) : Colors.grey.shade400,
          borderRadius: BorderRadius.circular(20),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        alignment: Alignment.bottomCenter,
        children: [
          // ---------------- PAGE TRANSITION ----------------
AnimatedSwitcher(
  duration: const Duration(milliseconds: 700),
  switchInCurve: Curves.easeInOutCubic,
  switchOutCurve: Curves.easeInOutCubic,
  transitionBuilder: (child, animation) {
    return FadeTransition(
      opacity: animation,
      child: SlideTransition(
        position: Tween<Offset>(
          begin: const Offset(0.05, 0),
          end: Offset.zero,
        ).animate(animation),
        child: child,
      ),
    );
  },
  child: KeyedSubtree(
    key: ValueKey(_currentIndex), // 🔥 THIS FIXES FREEZING
    child: _pages[_currentIndex],
  ),
),


          // ---------------- DOT INDICATORS ----------------
          Positioned(
            bottom: 25,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(_pages.length, (index) {
                return _dot(
                  isActive: _currentIndex == index,
                  onTap: () => _onDotTapped(index),
                );
              }),
            ),
          ),
        ],
      ),
    );
  }
}
