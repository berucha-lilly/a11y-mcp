#!/bin/bash
# filepath: generate-git-diff-files-for-github-copilot-pr-summary.sh
# Simply run:  ./generate-git-diff-files-for-github-copilot-pr-summary.sh

# Uncomment the second command of each to get the diff from the last commit within the same branch instead

# Create a summary of files changed with statistics
# git diff --stat dev...DRS-878-eAuthor-Bad-Response-Modal > /tmp/pr-summary.txt
git diff --stat HEAD > /tmp/pr-summary.txt

# Create a detailed diff with code context
# git diff -U9 -w dev...DRS-878-eAuthor-Bad-Response-Modal > /tmp/pr-diff.txt
git diff -U9 -w HEAD > /tmp/pr-diff.txt


# Open the summary and diff files in Visual Studio Code
code /tmp/pr-summary.txt /tmp/pr-diff.txt

