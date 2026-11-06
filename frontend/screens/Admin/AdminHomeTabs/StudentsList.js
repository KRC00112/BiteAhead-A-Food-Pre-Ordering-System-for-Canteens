import { View, Text } from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import styles from "../../../styles"
import home from "../../../styles/screens/home"

import {useEffect, useState} from "react";
import { ScrollView } from "react-native";
import { AdminUserCard } from "../../../components/AdminDataCard";
import SearchBar from "../../../components/SearchBar";


export default function StudentsList({route}){

    const loggedInUserData = route?.params?.userData;
    const token = loggedInUserData?.access_token;
    const [studentsList, setStudentsList]=useState([]);
    const [search, setSearch]=useState("");

    useEffect(() => {
        async function getUsersList() {
            
            const response=await fetch('https://canteen-backend-xzko.onrender.com/admin/users?role=STUDENT',{
                headers:{
                    'Authorization': `Bearer ${token}`
                }
            });
            const data =await response.json();
            setStudentsList(data);
            
        }

        getUsersList();

    },[token]);

    return(
        <SafeAreaView style={home.container} edges={['top', 'left', 'right']}>
            <View style={styles.defaultView}>
                <ScrollView>
                    <SearchBar value={search} onChangeText={setSearch} placeholder="Search students..." />
                    {studentsList?.filter(student => `${student.username} ${student.institute_id}`.toLowerCase().includes(search.trim().toLowerCase())).map(student=>{
                        return(
                            <AdminUserCard key={student.id} user={student} />
                           
                        );
                    })}
                </ScrollView>
                
            </View>
        </SafeAreaView>
    );
}