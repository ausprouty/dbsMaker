<script>
export default {
  methods:{
    toFormData(params) {
      var formData = new FormData();
      for (var key in params) {
        formData.append(key, params[key]);
      }
      return formData;
    },
  }
}
</script>
