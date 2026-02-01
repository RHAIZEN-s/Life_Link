import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';
import 'dart:convert';

class LocalUserService {
  static Future<UserModel?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString('user');

    if (data == null) return null;

    return UserModel.fromMap(jsonDecode(data));
  }

  // static String? _profilePhotoPath;
  static const String _profilePhotoKey = 'profile_photo_base64';

  static Future<void> saveProfilePhotoBase64(String base64) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_profilePhotoKey, base64);
  }

  static Future<String?> getProfilePhotoBase64() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_profilePhotoKey);
  }

  // ------------------------------------------------------------
  // SAVE USER LOCALLY AFTER LOGIN / INITIAL PROFILE
  // ------------------------------------------------------------
  static Future<void> saveUser(UserModel user) async {
    final prefs = await SharedPreferences.getInstance();

    await prefs.setString('fullName', user.fullName);
    await prefs.setString('bloodGroup', user.bloodGroup);
    await prefs.setInt('donations', user.donations);
  }

  // ------------------------------------------------------------
  // GET USER IF EXISTS (returns null if not found)
  // ------------------------------------------------------------
  static Future<UserModel?> getUserOrNull() async {
    final prefs = await SharedPreferences.getInstance();

    if (!prefs.containsKey('fullName')) {
      return null;
    }

    return UserModel(
      fullName: prefs.getString('fullName') ?? "",
      bloodGroup: prefs.getString('bloodGroup') ?? "A+",
      donations: prefs.getInt('donations') ?? 0,
    );
  }

  // ------------------------------------------------------------
  // UPDATE USER (for Edit Profile Page)
  // ------------------------------------------------------------
  static Future<void> updateUser(UserModel user) async {
    await saveUser(user);
  }

  // ------------------------------------------------------------
  // CLEAR USER (optional logout or reset)
  // ------------------------------------------------------------
  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }

  // ------------------------------------------------------------
  // SAVE EMAIL LOCALLY
  // ------------------------------------------------------------
  static Future<void> saveEmail(String email) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('email', email);
  }

  // ------------------------------------------------------------
  // GET EMAIL IF EXISTS (returns null if not found)
  // ------------------------------------------------------------
  static Future<String?> getEmail() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('email');
  }

  // ------------------------------------------------------------
  // SAVE ALL PROFILE DATA
  // ------------------------------------------------------------
  static Future<void> saveProfileData({
    String? address,
    String? dob,
    String? gender,
    String? disease,
    String? geneticDisorder,
    String? geneticOther,
    String? surgeries,
    String? allergies,
    String? medications,
    bool? availableToDonate,
    bool? receiveNotifications,
  }) async {
    final prefs = await SharedPreferences.getInstance();

    if (address != null) await prefs.setString('address', address);
    if (dob != null) await prefs.setString('dob', dob);
    if (gender != null) await prefs.setString('gender', gender);
    if (disease != null) await prefs.setString('disease', disease);
    if (geneticDisorder != null)
      await prefs.setString('geneticDisorder', geneticDisorder);
    if (geneticOther != null)
      await prefs.setString('geneticOther', geneticOther);
    if (surgeries != null) await prefs.setString('surgeries', surgeries);
    if (allergies != null) await prefs.setString('allergies', allergies);
    if (medications != null) await prefs.setString('medications', medications);
    if (availableToDonate != null)
      await prefs.setBool('availableToDonate', availableToDonate);
    if (receiveNotifications != null)
      await prefs.setBool('receiveNotifications', receiveNotifications);
  }

  // ------------------------------------------------------------
  // GET ALL PROFILE DATA
  // ------------------------------------------------------------
  static Future<Map<String, dynamic>> getProfileData() async {
    final prefs = await SharedPreferences.getInstance();

    return {
      'address': prefs.getString('address'),
      'dob': prefs.getString('dob'),
      'gender': prefs.getString('gender'),
      'disease': prefs.getString('disease'),
      'geneticDisorder': prefs.getString('geneticDisorder'),
      'geneticOther': prefs.getString('geneticOther'),
      'surgeries': prefs.getString('surgeries'),
      'allergies': prefs.getString('allergies'),
      'medications': prefs.getString('medications'),
      'availableToDonate': prefs.getBool('availableToDonate') ?? false,
      'receiveNotifications': prefs.getBool('receiveNotifications') ?? true,
    };
  }
}
