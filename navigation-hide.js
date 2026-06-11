// Hide navigation when scrolling past hero section
(function() {
    console.log('Navigation hide script loaded!');
    const nav = document.querySelector('.main-nav');
    const hero = document.querySelector('.hero');

    if (!nav || !hero) {
        console.error('Navigation or Hero section not found!');
        return;
    }

    const heroHeight = hero.offsetHeight;

    function handleScroll() {
        const scrollPosition = window.scrollY;
        if (scrollPosition > heroHeight - 100) {
            nav.classList.add('hide-nav');
        } else {
            nav.classList.remove('hide-nav');
        }
    }

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    console.log('Navigation hide script initialized!');
})();