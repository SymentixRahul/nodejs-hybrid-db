module.exports = {
  local_storage_key: 'node-aws-dynamodb',
  aws_user_table_name: 'user',
  aws_local_config: {
    region: 'local',
    endpoint: 'http://localhost:8000'
  },
  aws_remote_config: {
    accessKeyId: 'YOUR_KEY',
    secretAccessKey: 'YOUR_SECRET_KEY',
    region: 'ap-south-1'
  }
};
