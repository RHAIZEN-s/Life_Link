class UserModel {
  final String fullName;
  final String bloodGroup;
  final int donations;

  UserModel({
    required this.fullName,
    required this.bloodGroup,
    required this.donations,
  });

  // Convert to map for SharedPreferences
  Map<String, dynamic> toMap() {
    return {
      "fullName": fullName,
      "bloodGroup": bloodGroup,
      "donations": donations,
    };
  }

  // Load from map
  factory UserModel.fromMap(Map<String, dynamic> map) {
    return UserModel(
      fullName: map["fullName"] ?? "",
      bloodGroup: map["bloodGroup"] ?? "A+",
      donations: map["donations"] ?? 0,
    );
  }
}
