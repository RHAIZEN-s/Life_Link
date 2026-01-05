// lib/screens/MainWelcome.dart
import 'package:flutter/material.dart';
import 'dart:async';
import 'AutoCarousel.dart';

class MainWelcome extends StatefulWidget {
  const MainWelcome({super.key});

  @override
  MainWelcomeState createState() => MainWelcomeState();
}

class MainWelcomeState extends State<MainWelcome> {
  @override
  void initState() {
    super.initState();

    // Move to AutoCarousel after 2 seconds
    Timer(const Duration(seconds: 2), () {
      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const AutoCarousel()),
      );
    });
  }

  // ASSET IMAGE HELPER
  Widget assetImage(
    String path, {
    double? width,
    double? height,
    BoxFit fit = BoxFit.contain,
  }) {
    return SizedBox(
      width: width,
      height: height,
      child: Image.asset(path, fit: fit),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Container(
          color: Colors.white,
          alignment: Alignment.center,
          child: assetImage(
            "assets/images/mainwelcomelogo.png",
            width: 220,
            height: 159,
          ),
        ),
      ),
    );
  }
}
