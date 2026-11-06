import { Pressable, Text, View, Alert } from 'react-native';
import register from '../styles/screens/register';
import styles from '../styles'
import { TextInput } from 'react-native';
import {useNavigation} from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

export default function Register(){
    const navigation = useNavigation();

    const [instituteID, setInstituteID]=useState("");
    const [username, setUsername]=useState("");
    const [email, setEmail]=useState("");
    const [password, setPassword]=useState("");
    const [confirmPassword,setConfirmPassword]=useState("");
    const [focus,setFocus]=useState(false);
    const [selectedRole,setSelectedRole]=useState("");
    const [showRoleOptions,setShowRoleOptions]=useState(false);

    async function sendData(){
        try{
            const endpointByRole = {
                STUDENT: 'student',
                FACULTY: 'faculty',
                CANTEEN_STAFF: 'staff',
            };
            const endpoint = endpointByRole[selectedRole];
            if (!endpoint) {
                Alert.alert('Registration Failed', 'Select Student, Faculty, or Staff as your role.');
                return;
            }

            const response = await fetch(`https://canteen-backend-xzko.onrender.com/auth/${endpoint}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    institute_id: instituteID.trim(),
                    username: username.trim(),
                    password,
                    confirm_password: confirmPassword,
                    email: email.trim() || null,
                }),
            });
            const responseText = await response.text();
            let data;
            try {
                data = responseText ? JSON.parse(responseText) : {};
            } catch {
                data = {};
            }

            if (!response.ok) {
                const detail = Array.isArray(data.detail)
                    ? data.detail.map(item => item.msg).join('\n')
                    : data.detail;
                Alert.alert('Registration Failed', detail || `Server error (${response.status}).`);
                return;
            }

            console.log(JSON.stringify(data));
            Alert.alert(
                'Success', data.message || 'Your account has been created!', [
                    {
                        text: 'Go to Login',
                        onPress:()=>navigation.navigate('Login')
                    }
                ]);

        }catch(error){
            Alert.alert('connection Error', 'Unable to connect to server.  Please try again');
            console.log(error)
        }

    }

    return(
        <SafeAreaView style={styles.container}> 
            <Text style={[styles.header]}>REGISTER</Text>
            
            <View style={styles.form}>
                <View style={styles.formInputComponent}>
                    <Text style={styles.formInputLabel} >Institude ID</Text>
                    <TextInput 
                        style={styles.inputText}
                        placeholder='Enter Institute ID...'
                        placeholderTextColor="#666666"
                        onChangeText={value=>setInstituteID(value)}
                    />
                </View>
                <View style={styles.formInputComponent}>
                    <Text style={styles.formInputLabel}>Username</Text>
                    <TextInput 
                        style={styles.inputText}
                        placeholder='Enter Username...'
                        placeholderTextColor="#666666"
                        onChangeText={value=>setUsername(value)}
                    />
                </View>
                <View style={styles.formInputComponent}>
                    <Text style={styles.formInputLabel}>Recovery email (optional)</Text>
                    <TextInput
                        style={styles.inputText}
                        placeholder="Enter recovery email..."
                        placeholderTextColor="#666666"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        onChangeText={value=>setEmail(value)}
                    />
                </View>
                <View style={styles.formInputComponent}>
                    <Text style={styles.formInputLabel}>Select role</Text>
                    <Pressable
                        style={styles.inputText}
                        onPress={() => setShowRoleOptions((current) => !current)}
                    >
                        <Text>{selectedRole || "Select role..."}</Text>
                    </Pressable>
                    {showRoleOptions && (
                        <View style={register.roleOptions}>
                            {[
                                ["STUDENT", "Student"],
                                ["FACULTY", "Faculty"],
                                ["CANTEEN_STAFF", "Staff"],
                            ].map(([value, label]) => (
                                <Pressable
                                    key={value}
                                    style={register.roleOption}
                                    onPress={() => {
                                        setSelectedRole(value);
                                        setShowRoleOptions(false);
                                    }}
                                >
                                    <Text>{label}</Text>
                                </Pressable>
                            ))}
                        </View>
                    )}
                </View>


                <View style={styles.formInputComponent}>
                    <Text style={styles.formInputLabel}>Password</Text>
                    <TextInput 
                        style={styles.inputText}
                        placeholder='Enter Password...'
                        placeholderTextColor="#666666"
                        secureTextEntry={false}
                        onChangeText={value=>setPassword(value)}
                    />
                </View>
                <View style={styles.formInputComponent}>
                    <View style={register.confirmPasswordLabels}>
                        <Text style={(focus===true && password!==confirmPassword)?register.confirmPasswordMismatchLabels:styles.formInputLabel}>Confirm Password</Text>
                        {(focus===true && password!==confirmPassword) && <Text style={(focus===true && password!==confirmPassword)?register.confirmPasswordMismatchLabels:styles.formInputLabel}>Password Mismatch</Text>}
                    </View>
                    <TextInput 
                        style={[styles.inputText, (focus===true && password!==confirmPassword) && register.inputTextMismatch]}
                        placeholder='Enter Password Again...'
                        placeholderTextColor="#666666"
                        secureTextEntry={false}
                        onFocus={()=>setFocus(true)}
                        onChangeText={value=>setConfirmPassword(value)}
                    />
                </View>
                <Pressable style={[styles.formInputComponent, styles.button]} onPress={sendData}>
                    <Text style={styles.buttonText}>REGISTER!</Text>
                </Pressable>
                <Text style={styles.accountAvailabilityMessage}>
                    Already have an account? <Text style={styles.link} onPress={() =>navigation.navigate('Login')}>Login here!</Text>
                </Text>
            </View>

        </SafeAreaView>
    );

}