#!/bin/bash
# Get the region information
# export AWS_REGION=$(aws configure get region)

tables=$(aws dynamodb list-tables --output text --region $AWS_REGION)
#tables=$(aws dynamodb list-tables --output text --region us-west-2)

while read -r table; do
  if [[ $table == *"Class"* ]]; then
    table_name=$table
  fi
done <<< "$tables"

#Get the index from the dynamodb tables
index_name=$(echo "${table_name}" | awk -F '-' '{print $2}')
environment_name=$(echo "${table_name}" | awk -F '-' '{print $3}' | tr -d '"')
echo "table_name: ${table_name}"
echo "index_name: ${index_name}"
echo "environment_name: ${environment_name}"

#Set the each dynamodb table names
course_name="Course-$index_name-$environment_name"
class_name="Class-$index_name-$environment_name"
channel_name="Channel-$index_name-$environment_name"
comment_name="Comment-$index_name-$environment_name"
echo "course_name: ${course_name}"
echo "class_name: ${class_name}"
echo "channel_name: ${channel_name}"
echo "comment_name: ${comment_name}"

#Set the current time
current_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

#Set the owner name
user_name="reinvent"

#Replace the table_name
sed -i -e "s/Course/$course_name/g" Course.json
sed -i -e "s/Class/$class_name/g" Class.json
sed -i -e "s/Channel/$channel_name/g" Channel.json
sed -i -e "s/Comment/$comment_name/g" Comment.json
sed -i -e "s/replace_time/$current_time/g" Course.json
sed -i -e "s/replace_time/$current_time/g" Class.json
sed -i -e "s/replace_time/$current_time/g" Channel.json
sed -i -e "s/replace_time/$current_time/g" Comment.json

#Insert the data into tables
aws dynamodb batch-write-item --request-items file://Course.json
aws dynamodb batch-write-item --request-items file://Class.json
#aws dynamodb batch-write-item --request-items file://Channel.json

# Insert the data into tables which are larger then 25 items
input_file="Comment.json"
total_items=$(jq --arg comment_name "$comment_name" '.[$comment_name] | length' "$input_file")
batch_size=25
num_batches=$(( (total_items + batch_size - 1) / batch_size ))

# Batch Upload for 25 items
for (( i=0; i<num_batches; i++ )); do
  jq --arg comment_name "$comment_name" "{
    \"$comment_name\": .[\$comment_name][$((i * batch_size)):$(((i + 1) * batch_size))]
  }" "$input_file" > batch.json
  
  # Comment sample data
  aws dynamodb batch-write-item --request-items file://batch.json
  
  echo "Batch $((i + 1)) of $num_batches uploaded."
done

rm batch.json