import os

# folders = ["app", "components", "styles"]
# # iterate through the files in the folders and delete the ones that end with .identifier
# for folder in folders:
#     # print(folder)
#     for file in os.listdir(folder):
#             if file.endswith(".Identifier"):
#                 os.remove(os.path.join(folder, file))



# components_path = "components"
# for subfolder in os.listdir(components_path):
#     full_subfolder_path = os.path.join(components_path, subfolder)
#     if os.path.isdir(full_subfolder_path):
#         for file in os.listdir(full_subfolder_path):
#             if file.endswith(".Identifier"):
#                 os.remove(os.path.join(full_subfolder_path, file))

for file in os.listdir():
    if file.endswith(".Identifier"):
        os.remove(file)