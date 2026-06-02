// Lấy slug từ URL (ví dụ: page.html?slug=about)
function getSlugFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('slug') || 'home';
}

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

// Hiển thị nội dung trang
function displayPage(pageData) {
    const pageContent = document.getElementById('pageContent');
    const pageTitle = document.getElementById('pageTitle');
    
    if (!pageData) {
        pageContent.innerHTML = `
            <div class="error-404">
                <h1>404</h1>
                <p>Trang không tồn tại</p>
                <a href="index.html">Quay về trang chủ</a>
            </div>
        `;
        pageTitle.textContent = '404 - Không tìm thấy';
        return;
    }
    
    pageTitle.textContent = pageData.title;
    document.getElementById('metaDescription').content = pageData.meta?.description || '';
    
    // Hiển thị nội dung HTML
    pageContent.innerHTML = pageData.content;
}

// Khởi tạo trang
async function initPage() {
    try {
        const contentJson = await loadContentJson();
        const slug = getSlugFromUrl();
        
        // Cập nhật site title
        document.getElementById('siteLogo').textContent = contentJson.site?.title || 'My Website';
        document.getElementById('footerText').textContent = contentJson.settings?.footer || '© 2024';
        
        // Tạo menu
        if (contentJson.menu) {
            buildMenu(contentJson.menu);
        }
        
        // Hiển thị nội dung trang
        const pageData = contentJson.pages?.[slug];
        displayPage(pageData);
        
    } catch (error) {
        console.error('Lỗi tải trang:', error);
        document.getElementById('pageContent').innerHTML = `
            <div class="error">
                <p>Có lỗi xảy ra khi tải trang. Vui lòng thử lại sau.</p>
                <a href="index.html">Quay về trang chủ</a>
            </div>
        `;
    }
}

// Menu mobile toggle
document.addEventListener('DOMContentLoaded', function() {
    initPage();
    
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');
    
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
    }
});
