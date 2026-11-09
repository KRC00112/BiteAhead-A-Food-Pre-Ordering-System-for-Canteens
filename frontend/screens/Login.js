import { Alert, Pressable, Text, View, TextInput } from 'react-native';
import login from '../styles/screens/login';
import styles from '../styles'
import PasswordInput from '../components/PasswordInput';
import {useNavigation} from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { getAuthErrorMessage } from '../components/authMessages';


export default function Login(){
    const navigation = useNavigation();
    const [instituteID, setInstituteID]=useState("");
    const [password, setPassword]=useState("");
    

    async function sendData(){
    if (!instituteID.trim()) {
        Alert.alert('Institute ID required', 'Enter your Institute ID.');
        return;
    }
    if (!password) {
        Alert.alert('Password required', 'Enter your password.');
        return;
    }

    try{
        const response = await fetch(`https://canteen-backend-xzko.onrender.com/auth/login`,{
            method: 'POST',
            headers:{
                'Content-Type':'application/json'
            },
            body:JSON.stringify({ 
                institute_id: instituteID,
                password: password 
            }
        )

        });
         
        if(!response.ok){
            const responseText = await response.text();
            let data = {};
            try {
                data = responseText ? JSON.parse(responseText) : {};
            } catch {
                data = {};
            }
            Alert.alert(
                'Login Failed',
                response.status === 401
                    ? 'The Institute ID or password is incorrect.'
                    : getAuthErrorMessage(data, `Unable to log in (server error ${response.status}).`),
            );
            return;
        }
        const data=await response.json();
        console.log(JSON.stringify(data));
        Alert.alert(
                'Success', 'Logged In Successfully!', [
                    {
                        text: 'Go to Home',
                        onPress:()=>navigation.popTo('Home',{userData: data})
                    }
                ]
            );
       
    }catch(error){
        Alert.alert('connection Error', 'Unable to connect to server.  Please try again');
        console.log(error)
    }

    }
    

    return(
        <SafeAreaView style={styles.container}> 
            <Text style={[styles.header]}>LOG IN</Text>
            
            <View style={styles.form}>
                <View style={styles.formInputComponent}>
                    <Text style={styles.formInputLabel}>Institude ID</Text>
                    <TextInput 
                        style={styles.inputText}
                        placeholder='Enter Institute ID...'
                        placeholderTextColor="#666666"
                        onChangeText={value=>setInstituteID(value)}
                    />
                </View>
                <View style={styles.formInputComponent}>
                    <Text style={styles.formInputLabel}>Password</Text>
                    <PasswordInput
                        placeholder='Enter Password...'
                        placeholderTextColor="#666666"
                        onChangeText={value=>setPassword(value)}
                    />
                </View>
                <Pressable style={[styles.button, styles.formInputComponent]} onPress={sendData}>{/*replace braces values of onpress with sendData*/}
                    <Text style={styles.buttonText}>LOG IN!</Text>
                </Pressable>
                <Text style={styles.accountAvailabilityMessage}>
                    Don't have an account? <Text style={styles.link} onPress={() =>navigation.navigate('Register')}>Register here!</Text>
                </Text>

                <Text style={styles.accountAvailabilityMessage}>
                    Forgot your password? <Text style={styles.link} onPress={() =>navigation.navigate('ForgotPassword')}>Reset it here</Text>
                </Text>
                
            </View>

        </SafeAreaView>
    );

}