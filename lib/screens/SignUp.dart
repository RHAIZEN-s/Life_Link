import 'package:flutter/material.dart';

class SignUp extends StatefulWidget {
  const SignUp({super.key});

  @override
  SignUpState createState() => SignUpState();
}

class SignUpState extends State<SignUp> {
  final TextEditingController nameController = TextEditingController();
  final TextEditingController phoneController = TextEditingController();
  final TextEditingController otpController = TextEditingController();

  late String userRole;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    userRole = ModalRoute.of(context)?.settings.arguments as String? ?? "User";
  }

  void _signup() {
    if (nameController.text.isEmpty ||
        phoneController.text.isEmpty ||
        otpController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please fill all fields")),
      );
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text("Signed up as $userRole")),
    );

    Navigator.pushReplacementNamed(
      context,
      '/login',
      arguments: userRole,
    );
  }


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
        child: SingleChildScrollView(
          child: Column(
            children: [
              const SizedBox(height: 40),

              // MINI LOGO (ASSET)
              assetImage(
                "assets/images/minilogo.png",
                width: 160,
                height: 40,
              ),

              

              const SizedBox(height: 30),

              const Text(
                "Sign Up",
                style: TextStyle(
                  color: Color(0xFFC62C2C),
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Text(
                "Please register below",
                style: TextStyle(
                  color: Color(0xFF2E2D2D),
                  fontSize: 14,
                ),
              ),

              const SizedBox(height: 30),

              _boxField("Name", nameController),
              _boxField("Phone Number", phoneController),
              _boxField("OTP", otpController),

              const SizedBox(height: 40),

              // SIGN UP BUTTON (RESPONSIVE)
              GestureDetector(
                onTap: _signup,
                child: Container(
                  margin:
                      const EdgeInsets.symmetric(horizontal: 22, vertical: 20),
                  padding: const EdgeInsets.symmetric(vertical: 20),
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: const Color(0xFFC62C2C),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Center(
                    child: Text(
                      "Sign Up",
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),

              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text("Already have an account? "),
                  GestureDetector(
                    onTap: () => Navigator.pushReplacementNamed(
                      context,
                      '/login',
                      arguments: userRole,
                    ),
                    child: const Text(
                      "Log In",
                      style: TextStyle(
                        color: Color(0xFFC62C2C),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 50),
            ],
          ),
        ),
      ),
    );
  }

  // ------------------------------------------------------------
  // INPUT FIELD UI (UNCHANGED)
  // ------------------------------------------------------------
  Widget _boxField(String hint, TextEditingController controller) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 22, vertical: 10),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.black, width: 1),
      ),
      child: TextField(
        controller: controller,
        decoration: InputDecoration(
          hintText: hint,
          border: InputBorder.none,
          contentPadding:
              const EdgeInsets.symmetric(vertical: 20, horizontal: 10),
        ),
      ),
    );
  }
}
