import { StyleSheet } from 'react-native';

const register = StyleSheet.create({
 container: {
    display:'flex',
    flexDirection:'column',
    justifyContent:'center',
    alignItems:'center',
    width:'100%',
    height:'100%',
  },
  roleOptions: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#111111',
    marginTop: 4,
  },
  roleOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#AAAAAA',
  },
  confirmPasswordLabels:{
    display: 'flex',
    flexDirection: 'row',
    justifyContent:'space-between'
  },
  confirmPasswordMismatchLabels:{
    color:'red',
  },

});

export default register;