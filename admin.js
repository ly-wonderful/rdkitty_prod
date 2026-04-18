// admin.js
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.supabase) return;

    const authSection = document.getElementById('authSection');
    const dashboardSection = document.getElementById('dashboardSection');
    const authMsg = document.getElementById('authMsg');
    const folderSelect = document.getElementById('folderSelect');
    const logoutBtn = document.getElementById('logoutBtn');

    // Check session on load
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        showDashboard();
    }

    // Login
    document.getElementById('loginBtn').addEventListener('click', async () => {
        const email = document.getElementById('emailInput').value;
        const password = document.getElementById('passwordInput').value;
        
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
            authMsg.textContent = error.message;
        } else {
            showDashboard();
        }
    });

    // Logout
    logoutBtn.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        authSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
        logoutBtn.classList.add('hidden');
    });

    async function showDashboard() {
        authSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        await loadFolders();
    }

    async function loadFolders() {
        const { data, error } = await supabaseClient.from('folders').select('*').order('created_at', { ascending: false });
        if (error) return console.error(error);
        
        folderSelect.innerHTML = '<option value="">Select a folder...</option>';
        data.forEach(folder => {
            const opt = document.createElement('option');
            opt.value = folder.id;
            opt.textContent = folder.name;
            folderSelect.appendChild(opt);
        });
    }

    folderSelect.addEventListener('change', loadAdminMedia);

    async function loadAdminMedia() {
        const folder_id = folderSelect.value;
        const listContainer = document.getElementById('adminMediaList');
        if (!folder_id || !listContainer) return;

        listContainer.innerHTML = 'Loading...';
        const { data, error } = await supabaseClient.from('media').select('*').eq('folder_id', folder_id).order('created_at', { ascending: false });
        
        if (error) {
            listContainer.innerHTML = 'Error loading media: ' + error.message;
            return;
        }

        if (data.length === 0) {
            listContainer.innerHTML = '<p style="color:#777">No media inside this folder yet.</p>';
            return;
        }

        listContainer.innerHTML = '';
        data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'admin-media-item';
            
            let html = item.type === 'photo' ? `<img src="${item.url}" alt="photo">` : `<span>🎥 YouTube</span>`;
            html += `<span class="media-info" style="font-size:0.8rem">${item.url}</span>
                     <button class="btn-danger" data-id="${item.id}" data-url="${item.url}" data-type="${item.type}">Delete</button>`;
            
            div.innerHTML = html;
            listContainer.appendChild(div);
        });

        listContainer.querySelectorAll('.btn-danger').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (!confirm('Are you sure you want to delete this?')) return;
                
                const id = e.target.getAttribute('data-id');
                const url = e.target.getAttribute('data-url');
                const type = e.target.getAttribute('data-type');
                
                e.target.innerText = 'Deleting...';
                e.target.disabled = true;

                if (type === 'photo') {
                    const filePath = url.split('gallery_images/')[1];
                    if (filePath) await supabaseClient.storage.from('gallery_images').remove([filePath]);
                }

                const { error: delError } = await supabaseClient.from('media').delete().eq('id', id);
                if (delError) {
                    alert('Error: ' + delError.message);
                    e.target.innerText = 'Delete';
                    e.target.disabled = false;
                } else {
                    loadAdminMedia();
                }
            });
        });
    }

    // Create Folder
    document.getElementById('createFolderBtn').addEventListener('click', async () => {
        const name = document.getElementById('folderNameInput').value;
        if (!name) return alert('Enter a folder name');
        
        const { error } = await supabaseClient.from('folders').insert([{ name }]);
        if (error) return alert('Error generating folder: ' + error.message);
        
        document.getElementById('folderNameInput').value = '';
        await loadFolders();
        alert('Folder created!');
    });

    // Upload Photo
    document.getElementById('uploadPhotoBtn').addEventListener('click', async () => {
        const uploadBtn = document.getElementById('uploadPhotoBtn');
        const folderSelect = document.getElementById('folderSelect');
        const folder_id = folderSelect.value;
        const fileInput = document.getElementById('photoInput');
        const file = fileInput.files[0];
        
        if (!folder_id || !file) {
            return alert('Select a folder and a photo!');
        }
        
        uploadBtn.innerText = 'Uploading...';
        uploadBtn.disabled = true;

        const uploadBlobToSupabase = async (blobToUpload, isConverted) => {
            const fileName = `${Math.random()}.png`;
            const filePath = `${folder_id}/${fileName}`;
            
            try {
                const { error: uploadError } = await supabaseClient.storage.from('gallery_images').upload(filePath, blobToUpload, {
                    contentType: 'image/png'
                });
                
                if (uploadError) {
                    alert('Error uploading: ' + uploadError.message);
                } else {
                    const { data: { publicUrl } } = supabaseClient.storage.from('gallery_images').getPublicUrl(filePath);
                    
                    const { error: dbError } = await supabaseClient.from('media').insert([{ folder_id, type: 'photo', url: publicUrl }]);
                    if (dbError) {
                        alert('Error saving to db: ' + dbError.message);
                    } else {
                        alert(isConverted ? 'Photo converted to PNG & saved successfully!' : 'PNG Photo uploaded & saved successfully!');
                        fileInput.value = '';
                        loadAdminMedia();
                    }
                }
            } catch (err) {
                alert('An unknown error occurred: ' + err.message);
            }

            uploadBtn.innerText = 'Upload Photo';
            uploadBtn.disabled = false;
        };

        if (file.type === 'image/png') {
            await uploadBlobToSupabase(file, false);
        } else if (file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic') {
            // Convert HEIC directly to PNG Blob via heic2any
            uploadBtn.innerText = 'Converting HEIC to PNG...';
            try {
                if (typeof heic2any === 'undefined') {
                    throw new Error("heic2any library is not loaded.");
                }
                const convertedBlob = await heic2any({
                    blob: file,
                    toType: "image/png"
                });
                const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
                await uploadBlobToSupabase(finalBlob, true);
            } catch (err) {
                alert('Heic conversion failed: ' + err.message);
                uploadBtn.innerText = 'Upload Photo';
                uploadBtn.disabled = false;
            }
        } else {
            uploadBtn.innerText = 'Converting & Uploading...';
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                img.onload = async () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    canvas.toBlob(async (blob) => {
                        if (!blob) {
                            alert('Canvas failed to create Blob!');
                            uploadBtn.innerText = 'Upload Photo';
                            uploadBtn.disabled = false;
                            return;
                        }
                        await uploadBlobToSupabase(blob, true);
                    }, 'image/png');
                };

                img.onerror = () => {
                    alert(`Error reading "${file.name}" (Type: ${file.type || 'unknown'}) as an image. Please ensure it is a valid format like .jpg, .png, or .webp.`);
                    uploadBtn.innerText = 'Upload Photo';
                    uploadBtn.disabled = false;
                };

                img.src = e.target.result;
            };

            reader.onerror = () => {
                alert('Encountered an error trying to read the local file format.');
                uploadBtn.innerText = 'Upload Photo';
                uploadBtn.disabled = false;
            };

            reader.readAsDataURL(file);
        }
    });

    // Add YouTube Link
    document.getElementById('addYoutubeBtn').addEventListener('click', async () => {
        const folder_id = folderSelect.value;
        let url = document.getElementById('youtubeInput').value;
        
        if (!folder_id || !url) return alert('Select a folder and enter a link!');
        
        // Example naive conversion of normal youtube link to embed link
        if(url.includes('watch?v=')) {
            url = url.replace('watch?v=', 'embed/');
        }
        
        const { error } = await supabaseClient.from('media').insert([{ folder_id, type: 'youtube', url }]);
        if (error) return alert('Error saving to db: ' + error.message);
        
        alert('Video link saved successfully!');
        document.getElementById('youtubeInput').value = '';
        loadAdminMedia();
    });
});
