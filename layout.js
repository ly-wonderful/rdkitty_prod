class RDKittyHeader extends HTMLElement {
    connectedCallback() {
        const isHome = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');
        const isAdmin = window.location.pathname.endsWith('admin.html');
        
        this.innerHTML = `
        <nav class="navbar${isHome ? '' : ' scrolled'}">
            <div class="logo" style="cursor:pointer;" onclick="window.location.href='index.html'">RDKitty</div>
            <ul class="nav-links">
                <li><a href="index.html#home">Home</a></li>
                <li><a href="index.html#royalty">The Royalty</a></li>
                <li><a href="gallery.html">Gallery</a></li>
                <li><a href="products.html">Products</a></li>
                <li><a href="index.html#care">Care Guide</a></li>
            </ul>
            <div class="nav-right" style="display:flex; align-items:center; gap:15px;">
                <button class="nav-contact${isAdmin ? ' hidden' : ''}" ${isAdmin ? 'id="logoutBtn"' : ''}>${isAdmin ? 'Logout' : 'Contact Us'}</button>
                <div class="hamburger">
                    <span></span><span></span><span></span>
                </div>
            </div>
        </nav>
        `;

        const contactBtn = this.querySelector('.nav-contact');
        if (contactBtn && !isAdmin) {
            contactBtn.addEventListener('click', () => {
                window.location.href = 'mailto:meow@rdkitty.com';
            });
        }

        const hamburger = this.querySelector('.hamburger');
        const navLinks = this.querySelector('.nav-links');
        if (hamburger && navLinks) {
            hamburger.addEventListener('click', () => {
                navLinks.classList.toggle('active');
                hamburger.classList.toggle('active');
            });
            
            navLinks.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    navLinks.classList.remove('active');
                    hamburger.classList.remove('active');
                });
            });
        }
    }
}
customElements.define('rdkitty-header', RDKittyHeader);

class RDKittyFooter extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
        <footer>
            <div class="footer-content">
                <div class="footer-brand">
                    <h3>RDKitty</h3>
                    <p>Breeding beautiful Ragdolls with love.</p>
                </div>
                <div class="footer-links">
                    <p>Location: Windsong Ranch, Prosper, TX 75078</p>
                    <p>Contact: meow@rdkitty.com</p>
                    <p>&copy; 2026 RDKitty Cattery. All rights reserved.</p>
                    <a href="admin.html" style="color: rgba(255,255,255,0.4); text-decoration: none; font-size: 0.8rem; margin-top: 15px; display: inline-block;">Admin Login</a>
                </div>
            </div>
        </footer>
        `;
    }
}
customElements.define('rdkitty-footer', RDKittyFooter);

// --- Vercel Analytics Global Injection ---
if (typeof window !== 'undefined' && !window.va) {
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
    const vaScript = document.createElement('script');
    vaScript.defer = true;
    vaScript.src = '/_vercel/insights/script.js';
    document.head.appendChild(vaScript);
}
