<template>
  <div>
    <h2>Login</h2>
    <form v-on:submit="login">
      <b-field label="UserName">
        <b-input max-length="30" />
      </b-field>
      <b-field label="Password">
        <b-input type="password" password-reveal></b-input>
      </b-field>
      <input type="submit" value="Login" />
    </form>
  </div>
</template>

<script>
import router from '../router';
import axios from 'axios';

export default {
  name: 'Login',
  methods: {
    login: e => {
      e.preventDefault();
      let username = 'system username';
      let password = 'password';
      let login = () => {
        let data = {
          username: username,
          password: password,
        };
        axios
          .post('/auth', data)
          .then(response => {
            console.log(response);
            console.log('logged in');
            router.push('/server');
          })
          .catch(errors => {
            if (errors) {
              console.log('Login failed');
            }
          });
      };

      login();
    },
  },
};
</script>

<style lang="sass" scoped></style>
