#!/usr/bin/env bash

set -x

OCP_RELEASES=("release-4.12" "release-4.13" "release-4.14" "release-4.15" "release-4.16")

CONSOLE_BUILT_DATE=$(date +%Y%m%d)

PATCH_FILE_PATH=/home/runner/work/power-patch
CONSOLE_BUILD_TAR=/home/runner/work/console-tar

# create a patch directory and store power-patch.patch
mkdir $PATCH_FILE_PATH
cp power-patch.patch $PATCH_FILE_PATH

mkdir $CONSOLE_BUILD_TAR

echo "Installing IBM cloud CLI"
curl -fsSL https://clis.cloud.ibm.com/install/linux | sh

echo "Login to the IBM cloud with the cloud API key"
echo "4" | ibmcloud login -g ${IBMCLOUD_RESOURCE_GROUP}

echo "Install IBM Cloud Object Storage plugin"
ibmcloud plugin install cloud-object-storage

echo "Set the CRN for the COS"
echo "${IBMCLOUD_COS_CRN}" | ibmcloud cos config crn

ibmcloud cos config crn --list

ibmcloud cos buckets

for release_branch in "${OCP_RELEASES[@]}"
do

    git checkout $release_branch
    git apply $PATCH_FILE_PATH/power-patch.patch
    echo "Building the code..."
    ./build.sh
    echo "Creating a tar zip of build code..."
    tar -czvf "$CONSOLE_BUILD_TAR/console-built-$release_branch-$CONSOLE_BUILT_DATE.tgz" .
    echo "Upload the console tar ball to COS bucket"
    ibmcloud cos object-put --bucket $IBMCLOUD_COS_BUCKET --key console-built-$release_branch-$CONSOLE_BUILT_DATE.tgz --body "$CONSOLE_BUILD_TAR/console-built-$release_branch-$CONSOLE_BUILT_DATE.tgz" --region $IBMCLOUD_REGION
    git reset --hard

done



