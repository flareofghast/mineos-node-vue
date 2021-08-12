<template>
  <!-- <div class="centered"> -->
  <b-navbar centered="true">
    <template #brand>
      <b-navbar-item tag="router-link" :to="{ path: '/' }">
        MineOS
      </b-navbar-item>
    </template>
    <template #start>
      <b-navbar-item href="#">
        Home
      </b-navbar-item>
      <b-navbar-item href="#">
        About
      </b-navbar-item>
    </template>
    <template #end>
      <b-navbar-item tag="div">
        <div class="buttons">
          <a class="button is-primary" href="/login">
            Log In
          </a>
        </div>
      </b-navbar-item>
    </template>
  </b-navbar>
  <!-- </div> -->
</template>

<script>
export default {
  name: 'Nav',
};
</script>

<style></style>
<script>
export default {
  name: 'Nav',
};
</script>

<style lang="scss" scoped>
nav {
  margin-top: 25px;
  margin-bottom: 30px;
  a {
    font-weight: bold;
    color: #2c3e50;
    &.router-link-exact-action {
      color: #d88d00;
    }
  }
}
</style>
