
    // Toggles the Categories dropdown (desktop/mobile)
    function toggleCategoriesDropdown() {
        const catDropdown = document.getElementById("categoriesDropdown");
        // For smoother transitions on mobile, we'll use the 'show' class to control display/max-height
        catDropdown.classList.toggle("show");
        document.getElementById("profileMenu").classList.remove("show");
    }

    // Toggles the Profile dropdown (desktop/mobile)
    function toggleProfileDropdown() {
        document.getElementById("profileMenu").classList.toggle("show");
        document.getElementById("categoriesDropdown").classList.remove("show");
        
        // Ensure mobile menu is closed when opening profile dropdown
        document.getElementById("mobile-nav").classList.remove("open");
    }
    
    // NEW: Toggles the Mobile Menu (Hamburger)
    function toggleMobileMenu() {
        const mobileNav = document.getElementById('mobile-nav');
        mobileNav.classList.toggle('open');
        
        // Close other menus when opening the hamburger menu
        document.getElementById("profileMenu").classList.remove("show");
        document.getElementById("categoriesDropdown").classList.remove("show");
    }


    // Close dropdowns if the user clicks outside of them (Desktop Behavior)
    window.onclick = function(event) {
        // Handle Categories dropdown closure
        if (!event.target.matches('.dropdown-btn') && !event.target.closest('.dropdown-content')) {
            const categoriesDropdown = document.getElementById("categoriesDropdown");
            if (categoriesDropdown && categoriesDropdown.classList.contains('show')) {
                categoriesDropdown.classList.remove('show');
            }
        }
        
        // Handle Profile dropdown closure
        // We use .closest() to check if the click was inside the main profile container
        if (!event.target.closest('.profile-dropdown')) {
            const profileDropdown = document.getElementById("profileMenu");
            if (profileDropdown && profileDropdown.classList.contains('show')) {
                profileDropdown.classList.remove('show');
            }
        }
        
        // If screen is wide, ensure mobile menu isn't stuck open
        if (window.innerWidth > 968) {
             document.getElementById("mobile-nav").classList.remove("open");
        }
    }


    // product page
    function switchTab(index) {
        const tabs = document.querySelectorAll('.tab');
        const contents = document.querySelectorAll('.tab-content');
        
        tabs.forEach(tab => tab.classList.remove('active'));
        contents.forEach(content => content.classList.remove('active'));
        
        tabs[index].classList.add('active');
        contents[index].classList.add('active');
    }

    // Thumbnail switching
    const thumbnails = document.querySelectorAll('.thumbnail');
    thumbnails.forEach((thumb, index) => {
        thumb.addEventListener('click', () => {
            thumbnails.forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
        });
    });

    // Wishlist toggle
    const wishlistBtn = document.querySelector('.wishlist-btn');
    wishlistBtn.addEventListener('click', () => {
        const icon = wishlistBtn.querySelector('i');
        icon.classList.toggle('far');
        icon.classList.toggle('fas');
    });