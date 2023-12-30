# This requires AWS CLI configured with correct credentials.

# UNCOMMENT AND CONFIGURE THESE VARIABLES
# $ECR_HOST="your_ecr_repo_host.dkr.ecr.ap-southeast-2.amazonaws.com"
# $ECR_REPOSITORY="your_ecr_repo_name"

aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin $ECR_HOST

docker build -t $ECR_REPOSITORY .

docker tag $ECR_REPOSITORY:latest $ECR_HOST/$ECR_REPOSITORY:blog-crawler

docker push $ECR_HOST/$ECR_REPOSITORY:blog-crawler