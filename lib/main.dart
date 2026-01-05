import 'package:flutter/material.dart';

// ------------------ EXISTING SCREENS ------------------
import 'screens/MainWelcome.dart';
import 'screens/Caraousel1.dart';
import 'screens/Caraousel2.dart';
import 'screens/Caraousel3.dart';
import 'screens/Caraousel4.dart';
import 'screens/Login.dart';
import 'screens/SignUp.dart';
import 'screens/AutoCarousel.dart';
import 'screens/InitialProfilePage.dart';

// ------------------ USER SCREENS ------------------
import 'screens/user_homepage.dart';
import 'screens/user_profile_page.dart';
import 'screens/search_page.dart';
import 'screens/requests_page.dart';

// ------------------ ADMIN SCREENS ------------------
import 'screens/admin_home_page.dart';
import 'screens/admin_profile_page.dart';

void main() {
  runApp(const LifeLinkApp());
}

class LifeLinkApp extends StatelessWidget {
  const LifeLinkApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Life Link App',
      theme: ThemeData(primarySwatch: Colors.red),

      // FIRST SCREEN
      initialRoute: '/mainwelcome',

      routes: {
        // Welcome + Carousel Flow
        '/mainwelcome': (context) => const MainWelcome(),
        '/autocarousel': (context) => const AutoCarousel(),
        '/caraousel1': (context) => const Caraousel1(),
        '/caraousel2': (context) => const Caraousel2(),
        '/caraousel3': (context) => const Caraousel3(),
        '/caraousel4': (context) => const Caraousel4(),

        // Authentication
        '/login': (context) => const LogIn(),
        '/signup': (context) => const SignUp(),

        // Initial Profile Setup
        '/initial_profile': (context) => const InitialProfilePage(),

        // Main App Navigation
        // isAdmin will be passed manually from login
        '/mainnav': (context) => const MainNavigation(isAdmin: false),
      },
    );
  }
}

// ====================================================================
//                    MAIN NAVIGATION (USER + ADMIN)
// ====================================================================

class MainNavigation extends StatefulWidget {
  final bool isAdmin;

  const MainNavigation({super.key, required this.isAdmin});

  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    // ---------------------------------------------------------
    // SCREEN LIST BASED ON USER TYPE
    // ---------------------------------------------------------
    final List<Widget> screens = widget.isAdmin
        ? const [
            AdminHomePage(), // ADMIN HOME
            SearchPage(),
            RequestsPage(),
            AdminProfilePage(), // ADMIN PROFILE
          ]
        : const [
            UserHomePage(), // USER HOME
            SearchPage(),
            RequestsPage(),
            UserProfilePage(), // USER PROFILE
          ];

    return Scaffold(
      body: IndexedStack(index: _index, children: screens),

      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index,
        selectedItemColor: widget.isAdmin
            ? Colors.blueAccent
            : const Color(0xFFE63946),
        unselectedItemColor: const Color(0xFF457B9D),
        type: BottomNavigationBarType.fixed,

        onTap: (i) => setState(() => _index = i),

        items: const [
          BottomNavigationBarItem(
            icon: Text("🏠", style: TextStyle(fontSize: 22)),
            label: "Home",
          ),
          BottomNavigationBarItem(
            icon: Text("🔍", style: TextStyle(fontSize: 22)),
            label: "Search",
          ),
          BottomNavigationBarItem(
            icon: Text("📋", style: TextStyle(fontSize: 22)),
            label: "Requests",
          ),
          BottomNavigationBarItem(
            icon: Text("👤", style: TextStyle(fontSize: 22)),
            label: "Profile",
          ),
        ],
      ),
    );
  }
}
