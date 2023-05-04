#!/usr/bin/env bash

set -x

OCP_RELEASES=("release-4.10" "release-4.11" "release-4.12" "release-4.13" "release-4.14")

# Set global config to add user details
git config --global user.email "aditya.honkalas@ibm.com"
git config --global user.name "${GITHUB_ACTOR}" 

# Change the remote origin repo URL with git remote set-url
git remote set-url origin "https://$GITHUB_ACTOR:$GITHUB_PAT@github.com/$GITHUB_REPOSITORY"

# Add upstream repo
git remote add upstream $UPSTREAM_REPO

# Check the remote repositories and checkout to the local branch
git remote -v

# Fetch the remote upstream changes
git fetch upstream


for release_branch in "${OCP_RELEASES[@]}"
do

    git checkout --track origin/$release_branch

    # Rebase the local branch on the upstream branch
    REBASE_OUTPUT=$(git rebase upstream/$release_branch | grep "Current branch ${release_branch} is up to date." 2>&1)

    if [[ $REBASE_OUTPUT == "" ]]; then
        git push origin $release_branch -f
    fi

done

