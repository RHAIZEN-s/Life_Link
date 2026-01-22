import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import '../services/local_user_service.dart';
import '../models/user_model.dart';
import 'dart:convert';


class EditProfilePage extends StatefulWidget {
  const EditProfilePage({Key? key}) : super(key: key);

  @override
  State<EditProfilePage> createState() => _EditProfilePageState();
}

class _EditProfilePageState extends State<EditProfilePage> {
  // Controllers
  final TextEditingController _nameCtrl = TextEditingController();
  DateTime? _dob;

  String? _gender;
  String? _geneticDisorder;
  bool _availableToDonate = false;
  bool _receiveNotifications = true;

  final TextEditingController _addressCtrl = TextEditingController();
  final TextEditingController _emailCtrl = TextEditingController();
  final TextEditingController _diseaseCtrl = TextEditingController();
  final TextEditingController _geneticOtherCtrl = TextEditingController();
  final TextEditingController _allergyCtrl = TextEditingController();
  final TextEditingController _medicationCtrl = TextEditingController();

  String? _surgeries;

  ImageProvider? _photo;

  List<String> genderList = ["Male", "Female", "Other"];
  List<String> geneticList = [
    "Thalassemia",
    "Sickle Cell Anemia",
    "Cystic Fibrosis",
    "Hemophilia",
    "Other"
  ];

  // ------------------------------------------------------------
  // PICK PHOTO
  // ------------------------------------------------------------
Future<void> pickPhoto() async {
  final result = await FilePicker.platform.pickFiles(
    type: FileType.image,
    withData: true, // 🔥 REQUIRED FOR WEB
  );

  if (result != null && result.files.single.bytes != null) {
    final bytes = result.files.single.bytes!;
    final base64Image = base64Encode(bytes);

    setState(() {
      _photo = MemoryImage(bytes);
    });

    // ✅ SAVE IMAGE FOR ALL PLATFORMS
    await LocalUserService.saveProfilePhotoBase64(base64Image);
  }
}


  // ------------------------------------------------------------
  // PICK DOB
  // ------------------------------------------------------------
  Future<void> pickDOB() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(now.year - 25),
      firstDate: DateTime(1900),
      lastDate: now,
    );
    if (picked != null) setState(() => _dob = picked);
  }

  String get dobText {
    if (_dob == null) return "Select date";
    return "${_dob!.day}-${_dob!.month}-${_dob!.year}";
  }

  // ------------------------------------------------------------
  // SAVE PROFILE
  // ------------------------------------------------------------
void _saveProfile() async {
  final name = _nameCtrl.text.trim();

  if (name.isEmpty) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("Name cannot be empty")),
    );
    return;
  }

  final user = UserModel(
    fullName: name,
    bloodGroup: "A+",
    donations: 5,
  );

  await LocalUserService.updateUser(user);

  // ✅ Send selected photo back to UserProfilePage
  Navigator.pop(context, _photo);
}


    // Save only minimal fields 
  //   final user = UserModel(
  //     fullName: name,
  //     bloodGroup: "A+", // temporary default
  //     donations: 5, // dummy
  //   );

  //   await LocalUserService.updateUser(user);

  //   ScaffoldMessenger.of(context).showSnackBar(
  //     const SnackBar(content: Text("Profile Saved")),
  //   );
  // }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1D3557),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // HEADER
              Container(
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFE63946), Color(0xFFFF6B6B)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Edit Profile",
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.w800),
                    ),
                    SizedBox(height: 6),
                    Text(
                      "Update your details to stay verified & match-ready",
                      style: TextStyle(color: Colors.white70, fontSize: 13),
                    )
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // PHOTO SECTION
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18)),
                child: Column(
                  children: [
                    const Text(
                      "Profile Photo",
                      style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF1D3557)),
                    ),
                    const SizedBox(height: 14),

                    GestureDetector(
                      onTap: pickPhoto,
                      child: Container(
                        width: 120,
                        height: 120,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: const Color(0xFFE63946).withOpacity(0.4),
                            width: 3,
                          ),
                        ),
                        child: _photo == null
                            ? const Center(
                                child: Text(
                                  "Tap to Upload\nJPEG/PNG",
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: Color(0xFFE63946),
                                    fontWeight: FontWeight.w600,
                                    fontSize: 12,
                                  ),
                                ),
                              )
                            : ClipRRect(
                                borderRadius: BorderRadius.circular(17),
                                child: Image(
                                  image: _photo!,
                                  fit: BoxFit.cover,
                                ),
                              ),
                      ),
                    ),
                  ],
                ),
                
              ),
                const SizedBox(height: 20),



              const SizedBox(height: 20),

              // BASIC INFO
              buildSection(
                title: "Basic Information",
                children: [
                  buildInputLabel("Full Name"),
                  buildTextField(_nameCtrl, "Enter name"),

                  const SizedBox(height: 12),

                  buildInputLabel("Date of Birth"),
                  InkWell(
                    onTap: pickDOB,
                    child: InputDecorator(
                      decoration: inputDecoration(),
                      child: Row(
                        mainAxisAlignment:
                            MainAxisAlignment.spaceBetween,
                        children: [
                          Text(dobText),
                          const Icon(Icons.calendar_today, size: 18),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 12),

                  buildInputLabel("Gender"),
                  DropdownButtonFormField<String>(
                    value: _gender,
                    decoration: inputDecoration(),
                    items: genderList
                        .map((e) => DropdownMenuItem(
                              value: e,
                              child: Text(e),
                            ))
                        .toList(),
                    onChanged: (v) => setState(() => _gender = v),
                  ),

                  const SizedBox(height: 12),

                  buildInputLabel("Address"),
                  buildTextField(_addressCtrl, "Enter your address"),

                  const SizedBox(height: 12),

                  buildInputLabel("Email"),
                  buildTextField(_emailCtrl, "Enter email",
                      keyboard: TextInputType.emailAddress),
                ],
              ),

              const SizedBox(height: 20),

              // MEDICAL INFO
              buildSection(
                title: "Medical Information",
                children: [
                  buildInputLabel("Existing Diseases"),
                  buildTextField(_diseaseCtrl, "None / Diabetes etc"),

                  const SizedBox(height: 12),

                  buildInputLabel("Genetic Disorder"),
                  DropdownButtonFormField<String>(
                    value: _geneticDisorder,
                    decoration: inputDecoration(),
                    items: geneticList
                        .map((e) => DropdownMenuItem(
                              value: e,
                              child: Text(e),
                            ))
                        .toList(),
                    onChanged: (v) => setState(() {
                      _geneticDisorder = v;
                    }),
                  ),

                  if (_geneticDisorder == "Other")
                    Padding(
                      padding: const EdgeInsets.only(top: 10),
                      child: buildTextField(
                          _geneticOtherCtrl, "Specify other"),
                    ),

                  const SizedBox(height: 12),

                  buildInputLabel("Surgeries in Last 5 Years"),
                  DropdownButtonFormField<String>(
                    value: _surgeries,
                    decoration: inputDecoration(),
                    items: ["Yes", "No"]
                        .map((e) => DropdownMenuItem(
                              value: e,
                              child: Text(e),
                            ))
                        .toList(),
                    onChanged: (v) => setState(() => _surgeries = v),
                  ),

                  const SizedBox(height: 12),

                  buildInputLabel("Allergies"),
                  buildTextField(_allergyCtrl, "Optional"),

                  const SizedBox(height: 12),

                  buildInputLabel("Current Medications"),
                  buildTextField(_medicationCtrl, "Optional"),
                ],
              ),

              const SizedBox(height: 20),

              // PREFERENCES
              buildSection(
                title: "Preferences",
                children: [
                  buildToggle("Available to Donate",
                      _availableToDonate, (v) {
                    setState(() => _availableToDonate = v);
                  }),
                  buildToggle("Receive Notifications",
                      _receiveNotifications, (v) {
                    setState(() => _receiveNotifications = v);
                  }),
                ],
              ),

              const SizedBox(height: 20),

              // SAVE BUTTON
              ElevatedButton(
                onPressed: _saveProfile,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  backgroundColor: const Color(0xFFE63946),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  elevation: 6,
                ),
                child: const Text(
                  "Save Changes",
                  style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: Colors.white),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // UI HELPERS
  // ---------------------------------------------------------------------------

  Widget buildSection({
    required String title,
    required List<Widget> children,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
          color: Colors.white, borderRadius: BorderRadius.circular(18)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF1D3557))),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );
  }

  Widget buildInputLabel(String text) {
    return Text(text,
        style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: Color(0xFF1D3557)));
  }

  Widget buildTextField(TextEditingController controller, String hint,
      {TextInputType keyboard = TextInputType.text}) {
    return TextField(
      controller: controller,
      keyboardType: keyboard,
      decoration: inputDecoration(hint: hint),
    );
  }

  Widget buildToggle(String label, bool value, Function(bool) onChanged) {
    return Container(
      padding:
          const EdgeInsets.symmetric(vertical: 14, horizontal: 14),
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8F9FA),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFDDE3EA)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1D3557))),
          Switch(value: value, onChanged: (v) => onChanged(v))
        ],
      ),
    );
  }

  InputDecoration inputDecoration({String? hint}) {
    return InputDecoration(
      hintText: hint,
      filled: true,
      fillColor: const Color(0xFFF8F9FA),
      contentPadding:
          const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFDDE3EA)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFDDE3EA)),
      ),
    );
  }
}
