// Tải content.json từ GitHub
async function loadContentJson() {
    const token = localStorage.getItem('github_token') || '';
    const apiUrl = 'https://api.github.com/repos/ngtduc24/ngtduc24.github.io/contents/Data/content.json';
    
    const headers = {
        'Accept': 'application/vnd.github.v3+json'
    };
    
    if (token) {
        headers['Authorization'] = `token ${token}`;
    }
    
    const response = await fetch(apiUrl, { headers });
    const data = await response.json();
    
    // Giải mã nội dung base64
    const content = JSON.parse(atob(data.content));
    return content;
}

// Tạo menu từ dữ liệu
function buildMenu(menuItems) {
    const navMenu = document.getElementById('navMenu');
    if (!navMenu) return;
    
    navMenu.innerHTML = '';
    
    menuItems.forEach(item => {
        const li = document.createElement('li');
        
        let link = '#';
        if (item.type === 'page') {
            link = `page.html?slug=${item.slug}`;
        } else if (item.link) {
            link = item.link;
        }
        
        li.innerHTML = `<a href="${link}">${item.name}</a>`;
        
        // Nếu có menu con
        if (item.children && item.children.length > 0) {
            const subUl = document.createElement('ul');
            subUl.className = 'dropdown';
            
            item.children.forEach(child => {
                const subLi = document.createElement('li');
                let childLink = '#';
                if (child.type === 'page') {
                    childLink = `page.html?slug=${child.slug}`;
                } else if (child.link) {
                    childLink = child.link;
                }
                subLi.innerHTML = `<a href="${childLink}">${child.name}</a>`;
                subUl.appendChild(subLi);
            });
            
            li.appendChild(subUl);
            li.classList.add('has-dropdown');
        }
        
        navMenu.appendChild(li);
    });
}

// Đánh dấu menu đang active
function setActiveMenu() {
    // Trang chủ luôn active menu "home"
    const menuLinks = document.querySelectorAll('.nav-menu a');
    menuLinks.forEach(link => {
        if (link.getAttribute('href') === 'index.html') {
            link.classList.add('active');
        }
    });
}

// Khởi tạo trang chủ
async function initHomePage() {
    try {
        const contentJson = await loadContentJson();
        
        // Cập nhật site title
        const siteLogo = document.getElementById('siteLogo');
        if (siteLogo) {
            siteLogo.textContent = contentJson.site?.title || 'My Website';
        }
        
        // Cập nhật footer
        const footerText = document.getElementById('footerText');
        if (footerText) {
            footerText.textContent = contentJson.settings?.footer || '© 2024 My Website';
        }
        
        // Tạo menu
        if (contentJson.menu) {
            buildMenu(contentJson.menu);
            setActiveMenu();
        }
        
        // Hiển thị nội dung trang chủ (nếu có trong pages.home)
        const homePage = contentJson.pages?.home;
        const pageContent = document.getElementById('pageContent');
        if (homePage && pageContent) {
            pageContent.innerHTML = homePage.content;
        }
        
        // Cập nhật title
        if (homePage?.title) {
            document.title = homePage.title;
        }
        
    } catch (error) {
        console.error('Lỗi tải dữ liệu:', error);
    }
}

// Menu mobile toggle
document.addEventListener('DOMContentLoaded', function() {
    initHomePage();
    
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');
    
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
    }
});
