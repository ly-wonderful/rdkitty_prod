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
            <button class="nav-contact${isAdmin ? ' hidden' : ''}" ${isAdmin ? 'id="logoutBtn"' : ''}>${isAdmin ? 'Logout' : 'Contact Us'}</button>
        </nav>
        `;

        const contactBtn = this.querySelector('.nav-contact');
        if (contactBtn && !isAdmin) {
            contactBtn.addEventListener('click', () => {
                window.location.href = 'mailto:meow@rdkitty.com';
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
