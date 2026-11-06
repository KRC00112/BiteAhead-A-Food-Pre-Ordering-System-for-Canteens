import { Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { ScrollView } from "react-native";
import styles from "../../../styles";
import home from "../../../styles/screens/home";
import { AdminUserCard } from "../../../components/AdminDataCard";
import SearchBar from "../../../components/SearchBar";

const API_URL = "https://canteen-backend-xzko.onrender.com";

export default function StaffList({ route }) {
    const token = route?.params?.userData?.access_token;
    const [staffList, setStaffList] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);

    async function getStaffList() {
        if (!token) return;

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/admin/staff`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || "Unable to load staff accounts.");
            setStaffList(data);
        } catch (error) {
            Alert.alert("Staff list failed", error.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        getStaffList();
    }, [token]);

    async function updateStaffStatus(user, action) {
        try {
            const response = await fetch(`${API_URL}/admin/staff/${user.id}/${action}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || "Unable to update staff account.");
            setStaffList(current => current.map(member => member.id === data.id ? data : member));
            Alert.alert("Success", action === "approve" ? "Staff account approved." : "Staff account deactivated.");
        } catch (error) {
            Alert.alert("Account update failed", error.message);
        }
    }

    function confirmStatusChange(user, action) {
        const approving = action === "approve";
        Alert.alert(
            approving ? "Approve staff account?" : "Deactivate staff account?",
            `${user.username} will ${approving ? "be able to log in" : "no longer be able to log in"}.`,
            [
                { text: "Cancel", style: "cancel" },
                { text: approving ? "Approve" : "Deactivate", onPress: () => updateStaffStatus(user, action) },
            ]
        );
    }

    return (
        <SafeAreaView style={home.container} edges={["top", "left", "right"]}>
            <View style={styles.defaultView}>
                <Pressable
                    onPress={getStaffList}
                    disabled={loading}
                    style={{ backgroundColor: "#B8F23D", borderWidth: 3, borderColor: "#111111", padding: 12, marginBottom: 10, alignItems: "center" }}
                >
                    <Text style={{ fontWeight: "900" }}>{loading ? "LOADING..." : "REFRESH STAFF"}</Text>
                </Pressable>
                <ScrollView>
                    <SearchBar value={search} onChangeText={setSearch} placeholder="Search staff..." />
                    {staffList.filter(member => `${member.username} ${member.institute_id} ${member.account_status}`.toLowerCase().includes(search.trim().toLowerCase())).map(member => (
                        <View key={member.id}>
                            <AdminUserCard user={member} />
                            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                                {member.account_status !== "ACTIVE" && (
                                    <Pressable
                                        onPress={() => confirmStatusChange(member, "approve")}
                                        style={{ flex: 1, backgroundColor: "#B8F23D", borderWidth: 3, borderColor: "#111111", padding: 12, alignItems: "center" }}
                                    >
                                        <Text style={{ fontWeight: "900" }}>{member.account_status === "PENDING" ? "APPROVE" : "REACTIVATE"}</Text>
                                    </Pressable>
                                )}
                                {member.account_status !== "INACTIVE" && (
                                    <Pressable
                                        onPress={() => confirmStatusChange(member, "deactivate")}
                                        style={{ flex: 1, backgroundColor: "#FF8066", borderWidth: 3, borderColor: "#111111", padding: 12, alignItems: "center" }}
                                    >
                                        <Text style={{ fontWeight: "900" }}>DEACTIVATE</Text>
                                    </Pressable>
                                )}
                            </View>
                        </View>
                    ))}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}
