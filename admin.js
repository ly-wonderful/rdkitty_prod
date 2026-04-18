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
        if (typeof loadAdminProducts === 'function') await loadAdminProducts();
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

        // Render draggable folder list
        const adminFolderList = document.getElementById('adminFolderList');
        if (!adminFolderList) return;
        adminFolderList.innerHTML = '';
        
        data.forEach(folder => {
            const div = document.createElement('div');
            div.className = 'folder-item';
            div.draggable = true;
            div.dataset.id = folder.id;
            div.innerHTML = `<span><span style="color:#aaa; margin-right:10px;">☰</span> ${folder.name}</span> <button class="btn-danger btn-sm" onclick="window.deleteFolder('${folder.id}')">Delete</button>`;
            
            div.addEventListener('dragstart', () => div.classList.add('dragging'));
            div.addEventListener('dragend', () => {
                div.classList.remove('dragging');
                saveFolderOrder();
            });
            adminFolderList.appendChild(div);
        });
    }

    const adminFolderListDOM = document.getElementById('adminFolderList');
    if (adminFolderListDOM) {
        adminFolderListDOM.addEventListener('dragover', e => {
            e.preventDefault();
            const afterElement = getDragAfterElement(adminFolderListDOM, e.clientY, '.folder-item');
            const draggable = document.querySelector('.dragging');
            if (draggable && afterElement == null) {
                adminFolderListDOM.appendChild(draggable);
            } else if (draggable) {
                adminFolderListDOM.insertBefore(draggable, afterElement);
            }
        });
    }

    const adminMediaListDOM = document.getElementById('adminMediaList');
    if (adminMediaListDOM) {
        adminMediaListDOM.addEventListener('dragover', e => {
            e.preventDefault();
            const afterElement = getDragAfterElement(adminMediaListDOM, e.clientY, '.admin-media-item');
            const draggable = document.querySelector('.dragging');
            if (draggable && afterElement == null) {
                adminMediaListDOM.appendChild(draggable);
            } else if (draggable) {
                adminMediaListDOM.insertBefore(draggable, afterElement);
            }
        });
    }

    function getDragAfterElement(container, y, itemClass) {
        const draggableElements = [...container.querySelectorAll(itemClass + ':not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    async function saveFolderOrder() {
        const items = document.querySelectorAll('#adminFolderList .folder-item');
        let time = Date.now();
        const updates = [];
        
        items.forEach((item, index) => {
            // Highest timestamp loads first in the database.
            const newDate = new Date(time - index * 1000).toISOString();
            updates.push({ id: item.dataset.id, created_at: newDate });
        });

        for (let up of updates) {
            await supabaseClient.from('folders').update({ created_at: up.created_at }).eq('id', up.id);
        }
    }

    async function saveMediaOrder() {
        const items = document.querySelectorAll('#adminMediaList .admin-media-item');
        let time = Date.now();
        const updates = [];
        
        items.forEach((item, index) => {
            const newDate = new Date(time - index * 1000).toISOString();
            updates.push({ id: item.dataset.id, created_at: newDate });
        });

        for (let up of updates) {
            await supabaseClient.from('media').update({ created_at: up.created_at }).eq('id', up.id);
        }
    }

    window.deleteFolder = async (id) => {
        if (!confirm("Are you sure? This deletes the folder but its files might remain inside Storage!")) return;
        await supabaseClient.from('folders').delete().eq('id', id);
        loadFolders();
        if (folderSelect.value === id) folderSelect.value = '';
        loadAdminMedia();
    };

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
            div.draggable = true;
            div.dataset.id = item.id;
            
            let html = item.type === 'photo' ? `<img src="${item.url}" alt="photo">` : `<span>🎥 YouTube</span>`;
            html += `<span class="media-info" style="font-size:0.8rem">${item.url}</span>
                     <span style="flex-grow:1; text-align:right; margin-right:15px; color:#aaa;">☰</span>
                     <button class="btn-danger" data-id="${item.id}" data-url="${item.url}" data-type="${item.type}">Delete</button>`;
            
            div.innerHTML = html;

            div.addEventListener('dragstart', () => div.classList.add('dragging'));
            div.addEventListener('dragend', () => {
                div.classList.remove('dragging');
                saveMediaOrder();
            });

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
        const files = Array.from(fileInput.files);
        
        if (!folder_id || files.length === 0) {
            return alert('Select a folder and at least one photo!');
        }
        
        uploadBtn.innerText = `Preparing ${files.length} photo(s)...`;
        uploadBtn.disabled = true;

        const uploadBlobToSupabase = async (blobToUpload) => {
            const fileName = `${Math.random()}.png`;
            const filePath = `${folder_id}/${fileName}`;
            
            const { error: uploadError } = await supabaseClient.storage.from('gallery_images').upload(filePath, blobToUpload, {
                contentType: 'image/png'
            });
            if (uploadError) throw new Error('Storage: ' + uploadError.message);
            
            const { data: { publicUrl } } = supabaseClient.storage.from('gallery_images').getPublicUrl(filePath);
            
            const { error: dbError } = await supabaseClient.from('media').insert([{ folder_id, type: 'photo', url: publicUrl }]);
            if (dbError) throw new Error('Database: ' + dbError.message);
        };

        const processFile = (file) => {
            return new Promise((resolve, reject) => {
                if (file.type === 'image/png') {
                    uploadBlobToSupabase(file).then(resolve).catch(reject);
                } else if (file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic') {
                    if (typeof heic2any === 'undefined') return reject(new Error("heic2any library is not loaded."));
                    heic2any({ blob: file, toType: "image/png" })
                        .then(convertedBlob => {
                            const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
                            return uploadBlobToSupabase(finalBlob);
                        })
                        .then(resolve)
                        .catch(err => reject(new Error('HEIC Conversion: ' + err.message)));
                } else {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0);
                            
                            canvas.toBlob((blob) => {
                                if (!blob) return reject(new Error('Canvas failed to create Blob!'));
                                uploadBlobToSupabase(blob).then(resolve).catch(reject);
                            }, 'image/png');
                        };
                        img.onerror = () => reject(new Error(`Invalid image format for "${file.name}".`));
                        img.src = e.target.result;
                    };
                    reader.onerror = () => reject(new Error('FileReader error.'));
                    reader.readAsDataURL(file);
                }
            });
        };

        let successes = 0;
        let failures = 0;

        for (let i = 0; i < files.length; i++) {
            uploadBtn.innerText = `Processing ${i + 1} of ${files.length}...`;
            try {
                await processFile(files[i]);
                successes++;
            } catch (err) {
                console.error(err);
                failures++;
            }
        }

        uploadBtn.innerText = 'Upload Photos';
        uploadBtn.disabled = false;
        fileInput.value = '';
        
        alert(`Upload complete!\nSuccessfully uploaded: ${successes}\nFailed: ${failures}`);
        loadAdminMedia();
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

    // ==========================================
    // MANAGE PRODUCTS
    // ==========================================
    window.loadAdminProducts = async () => {
        const listContainer = document.getElementById('adminProductList');
        if (!listContainer) return;
        
        listContainer.innerHTML = 'Loading...';
        const { data, error } = await supabaseClient.from('products').select('*').order('created_at', { ascending: false });
        if (error) {
            listContainer.innerHTML = 'Error loading products: ' + error.message;
            return;
        }

        listContainer.innerHTML = '';
        data.forEach(prod => {
            const div = document.createElement('div');
            div.className = 'admin-media-item';
            div.draggable = true;
            div.dataset.id = prod.id;
            
            let html = `<img src="${prod.image_url}" alt="product image" style="border-radius:5px; object-fit:contain; max-width:60px; max-height:60px;">`;
            html += `<span class="media-info" style="font-size:0.85rem"><b>${prod.title}</b><br/><a href="${prod.amazon_link}" target="_blank" style="color:var(--dark-blue);">Link</a></span>
                     <span style="flex-grow:1; text-align:right; margin-right:15px; color:#aaa;">☰</span>
                     <button class="btn-danger btn-sm product-del-btn" data-id="${prod.id}" data-url="${prod.image_url}">Delete</button>`;
            
            div.innerHTML = html;
            
            div.addEventListener('dragstart', () => div.classList.add('dragging'));
            div.addEventListener('dragend', () => {
                div.classList.remove('dragging');
                saveProductOrder();
            });

            listContainer.appendChild(div);
        });

        listContainer.querySelectorAll('.product-del-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (!confirm('Are you sure you want to delete this product?')) return;
                const id = e.target.getAttribute('data-id');
                const url = e.target.getAttribute('data-url');
                e.target.innerText = 'Deleting...';
                
                // Delete image from storage
                const filePath = url.split('gallery_images/')[1];
                if (filePath) await supabaseClient.storage.from('gallery_images').remove([filePath]);
                
                // Delete from DB
                await supabaseClient.from('products').delete().eq('id', id);
                loadAdminProducts();
            });
        });
    };

    async function saveProductOrder() {
        const items = document.querySelectorAll('#adminProductList .admin-media-item');
        let time = Date.now();
        const updates = [];
        items.forEach((item, index) => {
            const newDate = new Date(time - index * 1000).toISOString();
            updates.push({ id: item.dataset.id, created_at: newDate });
        });
        for (let up of updates) {
            await supabaseClient.from('products').update({ created_at: up.created_at }).eq('id', up.id);
        }
    }

    const adminProductListDOM = document.getElementById('adminProductList');
    if (adminProductListDOM) {
        adminProductListDOM.addEventListener('dragover', e => {
            e.preventDefault();
            const afterElement = getDragAfterElement(adminProductListDOM, e.clientY, '.admin-media-item');
            const draggable = document.querySelector('.dragging');
            if (draggable && afterElement == null) {
                adminProductListDOM.appendChild(draggable);
            } else if (draggable) {
                adminProductListDOM.insertBefore(draggable, afterElement);
            }
        });
    }

    const autoFetchBtn = document.getElementById('autoFetchBtn');
    if (autoFetchBtn) {
        autoFetchBtn.addEventListener('click', async () => {
            const link = document.getElementById('prodLink').value;
            if (!link || !link.startsWith('http')) return alert('Please enter a valid URL.');
            
            autoFetchBtn.innerText = 'Fetching...';
            autoFetchBtn.disabled = true;

            try {
                // Use Microlink API to bypass cross-origin restrictions gracefully
                const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(link)}`);
                const json = await response.json();
                
                if (json.status === 'success' && json.data) {
                    const data = json.data;

                    let title = data.title || "";
                    let desc = data.description || "";

                    // Amazon Anti-Scrape Sanitization
                    if (title.toUpperCase().includes("AMAZON.COM")) {
                        title = title.replace(/^Amazon\.com\s*:\s*/i, '').split(' : ')[0];
                    }
                    if (desc.toUpperCase().includes("AMAZON.COM")) {
                        desc = desc.replace(/^Amazon\.com\s*:\s*/i, '').split(' : ')[0];
                    }
                    
                    if (title) document.getElementById('prodTitle').value = title;
                    if (desc) document.getElementById('prodDesc').value = desc;

                    const imgUrl = (data.image && data.image.url) ? data.image.url : "";
                    
                    // Amazon forces proxy bots to grab the Prime Logo instead of actual product images
                    const isAmazonGeneric = imgUrl.includes("Prime_Logo") || imgUrl.includes("favicon");

                    if (imgUrl && !isAmazonGeneric) {
                        document.getElementById('prodImageUrlHidden').value = imgUrl;
                        const preview = document.getElementById('prodImagePreview');
                        preview.src = imgUrl;
                        document.getElementById('prodImagePreviewContainer').style.display = 'block';
                    } else {
                        document.getElementById('prodImageUrlHidden').value = '';
                        document.getElementById('prodImagePreviewContainer').style.display = 'none';
                        alert("Text data fetched successfully!\n\nNote: Amazon's security blocked the product image. Please right-click the Amazon picture, save it, and upload it manually using the 'Product Image Override' button below.");
                    }
                } else {
                    alert('Could not automatically parse data. Attempt manually.');
                }
            } catch (err) {
                alert('Fetch failed: ' + err.message);
            }

            autoFetchBtn.innerText = 'Auto-Fetch';
            autoFetchBtn.disabled = false;
        });
    }

    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', async () => {
            const title = document.getElementById('prodTitle').value;
            const desc = document.getElementById('prodDesc').value;
            const link = document.getElementById('prodLink').value;
            const fileInput = document.getElementById('prodImageInput');
            const file = fileInput.files ? fileInput.files[0] : null;
            const fetchedImageUrl = document.getElementById('prodImageUrlHidden').value;

            if (!title || !link) return alert('Title and Amazon Link are strongly required!');
            if (!file && !fetchedImageUrl) return alert('Please Auto-Fetch or manually upload a Product Image!');
            
            addProductBtn.innerText = 'Publishing...';
            addProductBtn.disabled = true;

            const uploadToSupabase = async (blob) => {
                const fileName = `prod_${Math.random()}.png`;
                const filePath = `products/${fileName}`;
                const { error: upErr } = await supabaseClient.storage.from('gallery_images').upload(filePath, blob, { contentType: 'image/png' });
                if (upErr) throw new Error(upErr.message);
                
                const { data: { publicUrl } } = supabaseClient.storage.from('gallery_images').getPublicUrl(filePath);
                
                const { error: dbErr } = await supabaseClient.from('products').insert([{
                    title: title,
                    description: desc,
                    amazon_link: link,
                    image_url: publicUrl
                }]);
                if (dbErr) throw new Error(dbErr.message);
            };

            const processProductImage = (f) => {
                return new Promise((resolve, reject) => {
                    if (f.type === 'image/png') return uploadToSupabase(f).then(resolve).catch(reject);
                    if (f.name.toLowerCase().endsWith('.heic') || f.type === 'image/heic') {
                        if (typeof heic2any === 'undefined') return reject(new Error('heic2any missing'));
                        heic2any({ blob: f, toType: 'image/png' })
                            .then(conv => uploadToSupabase(Array.isArray(conv) ? conv[0] : conv))
                            .then(resolve)
                            .catch(err => reject(new Error('HEIC Convert: ' + err.message)));
                    } else {
                        const reader = new FileReader();
                        reader.onload = e => {
                            const img = new Image();
                            img.onload = () => {
                                const canvas = document.createElement('canvas');
                                canvas.width = img.width;
                                canvas.height = img.height;
                                const ctx = canvas.getContext('2d');
                                ctx.drawImage(img, 0, 0);
                                canvas.toBlob(b => {
                                    if (!b) return reject(new Error('Canvas error'));
                                    uploadToSupabase(b).then(resolve).catch(reject);
                                }, 'image/png');
                            };
                            img.onerror = () => reject(new Error('Invalid image.'));
                            img.src = e.target.result;
                        };
                        reader.onerror = () => reject(new Error('FileReader Error.'));
                        reader.readAsDataURL(f);
                    }
                });
            };

            try {
                if (file) {
                    await processProductImage(file);
                } else {
                    // Uses external URL natively without pushing image Blobs blindly 
                    const { error: dbErr } = await supabaseClient.from('products').insert([{
                        title: title,
                        description: desc,
                        amazon_link: link,
                        image_url: fetchedImageUrl
                    }]);
                    if (dbErr) throw new Error(dbErr.message);
                }

                alert('Product successfully published to the public page!');
                document.getElementById('prodTitle').value = '';
                document.getElementById('prodDesc').value = '';
                document.getElementById('prodLink').value = '';
                document.getElementById('prodImageUrlHidden').value = '';
                document.getElementById('prodImagePreviewContainer').style.display = 'none';
                if (fileInput) fileInput.value = '';
                loadAdminProducts();
            } catch(e) {
                alert('Error: ' + e.message);
            }
            
            addProductBtn.innerText = 'Publish Product';
            addProductBtn.disabled = false;
        });
    }
});
