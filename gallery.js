// gallery.js
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.supabase) return;

    const folderNav = document.getElementById('folderNav');
    const mediaGrid = document.getElementById('mediaGrid');
    
    let activeFolderId = null;

    // Load Folders
    async function loadFolders() {
        const { data: folders, error } = await supabaseClient.from('folders').select('*').order('created_at', { ascending: false });
        if (error || !folders.length) {
            folderNav.innerHTML = '<span>No collections created yet.</span>';
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const folderQuery = urlParams.get('folder');

        folderNav.innerHTML = ''; // clear loading text
        folders.forEach((folder, index) => {
            const btn = document.createElement('button');
            btn.className = 'folder-btn';
            btn.textContent = folder.name;
            
            let isActive = false;
            if (folderQuery && folder.name.toLowerCase().includes(folderQuery.toLowerCase())) {
                isActive = true;
            } else if (!folderQuery && index === 0) {
                isActive = true;
            }

            if (isActive && !activeFolderId) {
                btn.classList.add('active');
                activeFolderId = folder.id;
            }
            
            btn.addEventListener('click', () => {
                document.querySelectorAll('.folder-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeFolderId = folder.id;
                loadMedia();
            });

            folderNav.appendChild(btn);
        });

        if (!activeFolderId && folders.length > 0) {
            activeFolderId = folders[0].id;
            folderNav.firstChild.classList.add('active');
        }

        if (activeFolderId) {
            loadMedia();
        }
    }

    // Load Media for the active folder
    async function loadMedia() {
        mediaGrid.innerHTML = '<span>Loading media...</span>';
        
        const { data: media, error } = await supabaseClient
            .from('media')
            .select('*')
            .eq('folder_id', activeFolderId)
            .order('created_at', { ascending: false });

        mediaGrid.innerHTML = ''; // clear
        
        if (error) {
            mediaGrid.innerHTML = `<span class="empty-msg">Error loading media: ${error.message}</span>`;
            return;
        }

        if (media.length === 0) {
            mediaGrid.innerHTML = '<span class="empty-msg">This collection is empty.</span>';
            return;
        }

        media.forEach(item => {
            const wrapper = document.createElement('div');
            wrapper.className = 'media-item reveal fade-up active'; // add reveal classes instantly
            
            if (item.type === 'photo') {
                const img = document.createElement('img');
                img.src = item.url;
                img.loading = "lazy";
                wrapper.appendChild(img);
            } else if (item.type === 'youtube') {
                const iframe = document.createElement('iframe');
                iframe.src = item.url;
                iframe.allowFullscreen = true;
                wrapper.appendChild(iframe);
            }

            mediaGrid.appendChild(wrapper);
        });
    }

    loadFolders();
});
