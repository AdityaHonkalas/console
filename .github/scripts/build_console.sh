#!/usr/bin/env bash

echo "Apply a git patch for ppc64le"
git apply power-patch.patch

echo "Build console code"
./build.sh

export CONSOLE_BUILT_DATE=$(date +%Y%m%d)
export FILE_PATH=$PWD"/console-built-${CONSOLE_BUILT_DATE}.tgz"

echo "Creating console code tar console-built-${CONSOLE_BUILT_DATE}.tgz"
tar -czvf console-built-${CONSOLE_BUILT_DATE}.tgz .

# create a cloud connection to IBM cloud COS to upload the created console tarball

echo "Installing IBM cloud CLI"
curl -fsSL https://clis.cloud.ibm.com/install/linux | sh

echo "Login to the IBM cloud with the cloud API key"
echo $IBMCLOUD_REGION | ibmcloud login -g ${IBMCLOUD_RESOURCE_GROUP}

echo "Install IBM Cloud Object Storage plugin"
ibmcloud plugin install cloud-object-storage

echo "Set the CRN for the COS"
echo "${IBMCLOUD_COS_CRN}" | ibmcloud cos config crn

ibmcloud cos config crn --list

ibmcloud cos buckets

echo "Upload the console tar ball to COS bucket"
ibmcloud cos object-put --bucket $IBMCLOUD_COS_BUCKET --key console-built-${CONSOLE_BUILT_DATE} --body $FILE_PATH --region $IBMCLOUD_REGION


