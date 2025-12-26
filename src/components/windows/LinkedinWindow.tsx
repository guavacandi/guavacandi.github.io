export default function LinkedinWindow() {
  return (
    <div className="linkedin-styled">
      <div className="linkedin-body">
        <a
          href="https://www.linkedin.com/in/ngchloe1123/"
          target="_blank"
          rel="noopener noreferrer"
          className="linkedin-profile-link"
        >
          <div className="linkedin-preview">
            <img src="/images/profile.png" alt="Profile Photo" className="linkedin-profile-image" />
            <div className="linkedin-preview-text">
              <h3>Chloe Ng</h3>
              <p>Cybersecurity/Network Engineering Student at Purdue University</p>
              <span className="view-profile">View My LinkedIn Profile →</span>
            </div>
          </div>
        </a>
      </div>
    </div>
  );
}
