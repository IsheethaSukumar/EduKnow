import random
from datetime import datetime, timedelta
import bcrypt
from sqlalchemy.orm import Session
from models import User, Content, Interaction, Badge, UserBadge, SearchLog
import uuid

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# ─── Demo Users ───
DEMO_USERS = [
    {"username": "student1", "email": "student1@edukno.edu", "full_name": "Alice Johnson", "role": "student", "department": "Computer Science", "interests": ["python", "machine learning", "algorithms"]},
    {"username": "student2", "email": "student2@edukno.edu", "full_name": "Bob Smith", "role": "student", "department": "Mathematics", "interests": ["calculus", "statistics", "data science"]},
    {"username": "student3", "email": "student3@edukno.edu", "full_name": "Carol Davis", "role": "student", "department": "Physics", "interests": ["quantum mechanics", "astrophysics"]},
    {"username": "student4", "email": "student4@edukno.edu", "full_name": "David Lee", "role": "student", "department": "Computer Science", "interests": ["web development", "databases", "cloud"]},
    {"username": "student5", "email": "student5@edukno.edu", "full_name": "Eva Martinez", "role": "student", "department": "Biology", "interests": ["genetics", "ecology", "research"]},
    {"username": "faculty1", "email": "faculty1@edukno.edu", "full_name": "Dr. Sarah Wilson", "role": "faculty", "department": "Computer Science", "interests": ["AI", "deep learning", "research"]},
    {"username": "faculty2", "email": "faculty2@edukno.edu", "full_name": "Dr. James Brown", "role": "faculty", "department": "Mathematics", "interests": ["topology", "algebra", "education"]},
    {"username": "faculty3", "email": "faculty3@edukno.edu", "full_name": "Dr. Maria Garcia", "role": "faculty", "department": "Physics", "interests": ["particle physics", "cosmology"]},
    {"username": "staff1", "email": "staff1@edukno.edu", "full_name": "Tom Harris", "role": "staff", "department": "IT Services", "interests": ["infrastructure", "security"]},
    {"username": "admin1", "email": "admin1@edukno.edu", "full_name": "Lisa Chen", "role": "admin", "department": "Administration", "interests": ["management", "analytics"]},
    {"username": "alumni1", "email": "alumni1@edukno.edu", "full_name": "Mike Taylor", "role": "alumni", "department": "Computer Science", "interests": ["startups", "mentoring"]},
    {"username": "parent1", "email": "parent1@edukno.edu", "full_name": "Jennifer White", "role": "parent", "department": "General", "interests": ["progress tracking"]},
]

# More users to reach ~50
EXTRA_FIRST = ["Noah", "Emma", "Liam", "Olivia", "Ava", "Sophia", "Jackson", "Mia", "Ethan", "Isabella",
               "Lucas", "Charlotte", "Mason", "Amelia", "Logan", "Harper", "Alex", "Ella", "Aiden", "Abigail",
               "Caden", "Emily", "Jayden", "Madison", "Grayson", "Luna", "Benjamin", "Chloe", "Elijah", "Layla",
               "Oliver", "Riley", "Jack", "Zoey", "Ryan", "Nora", "Daniel", "Lily"]
DEPARTMENTS = ["Computer Science", "Mathematics", "Physics", "Biology", "Chemistry", "English", "History", "Engineering"]
INTEREST_POOL = ["python", "java", "algorithms", "calculus", "statistics", "research", "AI", "web development",
                 "databases", "physics", "chemistry", "biology", "literature", "history", "engineering"]

for i, name in enumerate(EXTRA_FIRST):
    DEMO_USERS.append({
        "username": f"user{i+13}",
        "email": f"user{i+13}@edukno.edu",
        "full_name": f"{name} User{i+13}",
        "role": random.choice(["student", "student", "student", "faculty", "staff"]),
        "department": random.choice(DEPARTMENTS),
        "interests": random.sample(INTEREST_POOL, 3),
    })

# ─── Demo Content (expanded with real open educational resource URLs) ───
CONTENT_TEMPLATES = [
    # ── Computer Science Documents ──
    {"title": "Introduction to Machine Learning", "description": "Comprehensive guide covering supervised learning, unsupervised learning, and reinforcement learning. Includes practical examples with Python and scikit-learn. Topics include linear regression, decision trees, neural networks, and model evaluation metrics. Covers bias-variance tradeoff, cross-validation, and hyperparameter tuning.", "type": "document", "category": "Computer Science", "tags": ["machine learning", "python", "AI", "scikit-learn"], "url": "https://ocw.mit.edu/courses/6-036-introduction-to-machine-learning-fall-2020/"},
    {"title": "Data Structures and Algorithms", "description": "Reference guide for common data structures (arrays, linked lists, trees, graphs, hash tables, heaps) and algorithms (sorting, searching, dynamic programming, greedy algorithms, BFS, DFS). Includes Big-O analysis and implementation in Python and Java.", "type": "document", "category": "Computer Science", "tags": ["algorithms", "data structures", "programming", "Big-O"], "url": "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/"},
    {"title": "Database Design Principles", "description": "Comprehensive resource on database design covering relational model, ER diagrams, normalization (1NF, 2NF, 3NF, BCNF), SQL queries, indexing strategies, transactions, ACID properties, and NoSQL databases (MongoDB, Redis, Cassandra).", "type": "document", "category": "Computer Science", "tags": ["database", "SQL", "design", "normalization"], "url": "https://ocw.mit.edu/courses/6-830-database-systems-fall-2010/"},
    {"title": "Operating Systems Concepts", "description": "Study guide covering process management, memory management (paging, segmentation), file systems, CPU scheduling algorithms (FCFS, SJF, Round Robin), deadlocks, concurrency (mutexes, semaphores), and virtual memory. Includes Linux kernel examples.", "type": "document", "category": "Computer Science", "tags": ["OS", "systems", "computing", "processes"], "url": "https://ocw.mit.edu/courses/6-828-operating-system-engineering-fall-2012/"},
    {"title": "Computer Networks Fundamentals", "description": "Detailed guide on OSI model, TCP/IP protocol suite, HTTP/HTTPS, DNS, routing algorithms, network security, firewalls, VPNs, socket programming, and cloud networking. Covers IPv4/IPv6, subnetting, and network troubleshooting.", "type": "document", "category": "Computer Science", "tags": ["networking", "TCP/IP", "protocols", "security"], "url": "https://ocw.mit.edu/courses/6-829-computer-networks-fall-2002/"},
    {"title": "Software Engineering Best Practices", "description": "Guide to software development methodologies (Agile, Scrum, Kanban), design patterns (Singleton, Factory, Observer, MVC), SOLID principles, code review practices, CI/CD pipelines, unit testing, integration testing, and documentation standards.", "type": "document", "category": "Computer Science", "tags": ["software engineering", "design patterns", "agile", "testing"], "url": "https://ocw.mit.edu/courses/6-170-software-studio-spring-2013/"},
    {"title": "Cybersecurity Essentials", "description": "Fundamentals of information security: cryptography (symmetric, asymmetric, hashing), authentication mechanisms, vulnerability assessment, penetration testing, OWASP Top 10, incident response, security policies, and compliance frameworks (NIST, ISO 27001).", "type": "document", "category": "Computer Science", "tags": ["security", "cryptography", "cybersecurity", "OWASP"], "url": "https://ocw.mit.edu/courses/6-858-computer-systems-security-fall-2014/"},
    {"title": "Compiler Design and Implementation", "description": "Study of compiler phases: lexical analysis, parsing (LL, LR), semantic analysis, intermediate code generation, optimization techniques, and code generation. Includes Flex/Bison examples and LLVM introduction.", "type": "document", "category": "Computer Science", "tags": ["compilers", "parsing", "programming languages"], "url": "https://ocw.mit.edu/courses/6-035-computer-language-engineering-spring-2010/"},
    {"title": "Artificial Intelligence: A Modern Approach", "description": "Covers search algorithms (A*, minimax), knowledge representation, probabilistic reasoning (Bayesian networks), natural language processing, computer vision fundamentals, robotics, and ethical AI considerations.", "type": "document", "category": "Computer Science", "tags": ["AI", "search", "NLP", "computer vision"], "url": "https://ocw.mit.edu/courses/6-034-artificial-intelligence-fall-2010/"},

    # ── Mathematics Documents ──
    {"title": "Calculus I Study Guide", "description": "Complete study guide for Calculus I covering limits, continuity, derivatives (product rule, chain rule, quotient rule), applications of derivatives (optimization, related rates), integrals (Riemann sums, fundamental theorem of calculus), and techniques of integration.", "type": "document", "category": "Mathematics", "tags": ["calculus", "math", "exam prep", "derivatives"], "url": "https://ocw.mit.edu/courses/18-01-single-variable-calculus-fall-2006/"},
    {"title": "Linear Algebra Cheat Sheet", "description": "Quick reference for matrices, vectors, eigenvalues, eigenvectors, linear transformations, orthogonality, Gram-Schmidt process, SVD decomposition, and applications in machine learning. Perfect for midterm exam preparation.", "type": "document", "category": "Mathematics", "tags": ["linear algebra", "math", "exam prep", "matrices"], "url": "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/"},
    {"title": "Probability Theory Notes", "description": "Covers random variables, probability distributions (binomial, Poisson, normal, exponential), expectation, variance, Bayes' theorem, law of large numbers, central limit theorem, and Markov chains.", "type": "document", "category": "Mathematics", "tags": ["probability", "math", "statistics", "distributions"], "url": "https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2014/"},
    {"title": "Discrete Mathematics", "description": "Covers propositional logic, set theory, combinatorics (permutations, combinations), graph theory, number theory, modular arithmetic, recurrence relations, generating functions, and mathematical proofs (induction, contradiction, contrapositive).", "type": "document", "category": "Mathematics", "tags": ["discrete math", "logic", "combinatorics", "proofs"], "url": "https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-fall-2010/"},
    {"title": "Number Theory Fundamentals", "description": "Introduction to prime numbers, divisibility, modular arithmetic, Euler's totient function, Chinese remainder theorem, quadratic residues, and applications in cryptography (RSA algorithm).", "type": "document", "category": "Mathematics", "tags": ["number theory", "math", "primes", "cryptography"], "url": "https://ocw.mit.edu/courses/18-781-theory-of-numbers-spring-2012/"},
    {"title": "Real Analysis Introduction", "description": "Covers sequences and series, convergence tests, continuity, differentiability, Riemann integration, metric spaces, compactness, and the topology of real numbers. Includes proofs and examples.", "type": "document", "category": "Mathematics", "tags": ["analysis", "math", "proofs", "topology"], "url": "https://ocw.mit.edu/courses/18-100a-real-analysis-fall-2020/"},
    {"title": "Abstract Algebra", "description": "Study of groups, rings, and fields. Covers group theory (Lagrange's theorem, normal subgroups, quotient groups), ring theory (ideals, polynomial rings), and field extensions. Applications in coding theory and cryptography.", "type": "document", "category": "Mathematics", "tags": ["algebra", "groups", "rings", "fields"], "url": "https://ocw.mit.edu/courses/18-703-modern-algebra-spring-2013/"},

    # ── Physics ──
    {"title": "Quantum Mechanics Fundamentals", "description": "An overview of quantum mechanics principles including wave-particle duality, Schrödinger equation, quantum entanglement, uncertainty principle, quantum tunneling, spin, and applications in quantum computing. Includes mathematical formalism with Hilbert spaces.", "type": "document", "category": "Physics", "tags": ["quantum", "physics", "theory", "Schrödinger"], "url": "https://ocw.mit.edu/courses/8-04-quantum-physics-i-spring-2016/"},
    {"title": "Thermodynamics Explained", "description": "Complete guide to laws of thermodynamics, entropy, enthalpy, Gibbs free energy, heat engines, Carnot cycle, phase transitions, statistical mechanics, and applications in engineering and chemistry.", "type": "document", "category": "Physics", "tags": ["thermodynamics", "physics", "entropy", "energy"], "url": "https://ocw.mit.edu/courses/8-333-statistical-mechanics-i-statistical-mechanics-of-particles-fall-2013/"},
    {"title": "Classical Mechanics", "description": "Newtonian mechanics, Lagrangian and Hamiltonian formulations, rigid body dynamics, oscillations, central forces, orbital mechanics, and relativistic mechanics. Includes problem sets and solutions.", "type": "document", "category": "Physics", "tags": ["mechanics", "physics", "Newton", "Lagrangian"], "url": "https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/"},
    {"title": "Electromagnetism and Optics", "description": "Maxwell's equations, electric and magnetic fields, electromagnetic waves, reflection, refraction, diffraction, polarization, interference, and applications in fiber optics and telecommunications.", "type": "document", "category": "Physics", "tags": ["electromagnetism", "optics", "Maxwell", "waves"], "url": "https://ocw.mit.edu/courses/8-02-physics-ii-electricity-and-magnetism-spring-2019/"},

    # ── Science ──
    {"title": "Organic Chemistry Lab Manual", "description": "Step-by-step laboratory procedures for organic chemistry experiments including distillation, chromatography, spectroscopy (NMR, IR, Mass Spec), synthesis reactions, and purification techniques. Includes safety protocols and report templates.", "type": "document", "category": "Chemistry", "tags": ["chemistry", "lab", "organic", "spectroscopy"], "url": "https://ocw.mit.edu/courses/5-301-chemistry-laboratory-techniques-january-iap-2012/"},
    {"title": "Cell Biology Lecture Notes", "description": "Covers cell structure (organelles, membrane), cell cycle, mitosis, meiosis, signal transduction, gene expression, protein synthesis, cellular respiration, photosynthesis, and stem cell biology.", "type": "document", "category": "Biology", "tags": ["biology", "cells", "lecture", "genetics"], "url": "https://ocw.mit.edu/courses/7-013-introductory-biology-spring-2018/"},
    {"title": "Molecular Biology Lab", "description": "Guide to molecular biology techniques: PCR, gel electrophoresis, DNA sequencing, cloning, CRISPR-Cas9 gene editing, Western blot, and bioinformatics tools. Includes protocols and troubleshooting guides.", "type": "document", "category": "Biology", "tags": ["molecular", "biology", "lab", "PCR", "CRISPR"], "url": "https://ocw.mit.edu/courses/7-014-introductory-biology-spring-2005/"},
    {"title": "Biochemistry Essentials", "description": "Covers amino acids, protein structure and folding, enzyme kinetics (Michaelis-Menten), metabolic pathways (glycolysis, citric acid cycle, oxidative phosphorylation), lipid metabolism, and nucleic acid biochemistry.", "type": "document", "category": "Biology", "tags": ["biochemistry", "enzymes", "metabolism", "proteins"], "url": "https://ocw.mit.edu/courses/7-01x-introduction-to-biology-the-secret-of-life-fall-2019/"},
    {"title": "Astronomy and Astrophysics", "description": "Study of stellar evolution, galaxy formation, cosmology, dark matter, dark energy, gravitational waves, exoplanets, telescope technology, and the Big Bang theory. Includes observational astronomy projects.", "type": "document", "category": "Physics", "tags": ["astronomy", "astrophysics", "cosmology", "stars"], "url": "https://ocw.mit.edu/courses/8-282j-introduction-to-astronomy-spring-2006/"},
    {"title": "Environmental Science Overview", "description": "Covers ecosystems, biodiversity, climate change science, renewable energy sources, pollution and remediation, water resources, sustainable development, and environmental policy and regulation.", "type": "document", "category": "Environmental Science", "tags": ["environment", "climate", "ecology", "sustainability"], "url": "https://ocw.mit.edu/courses/12-102-environmental-earth-science-spring-2024/"},

    # ── Humanities & Social Sciences ──
    {"title": "Academic Writing Handbook", "description": "Guidelines for academic writing including citation formats (APA, MLA, Chicago), thesis structure, literature review methodology, peer review process, avoiding plagiarism, and grant proposal writing.", "type": "document", "category": "English", "tags": ["writing", "academic", "research", "citation"], "url": "https://owl.purdue.edu/owl/research_and_citation/resources.html"},
    {"title": "History of Western Philosophy", "description": "Survey of Western philosophy from ancient Greece to modern era. Covers Socrates, Plato, Aristotle, Descartes, Kant, Hegel, Nietzsche, existentialism, phenomenology, and contemporary analytic philosophy.", "type": "document", "category": "History", "tags": ["philosophy", "history", "humanities", "ethics"], "url": "https://ocw.mit.edu/courses/24-01-classics-of-western-philosophy-spring-2016/"},
    {"title": "Introduction to Psychology", "description": "Covers cognitive psychology, behavioral psychology, developmental psychology (Piaget, Erikson), social psychology, abnormal psychology, neuroscience foundations, research methods, and therapeutic approaches (CBT, psychoanalysis).", "type": "document", "category": "Psychology", "tags": ["psychology", "cognition", "behavior", "mental health"], "url": "https://ocw.mit.edu/courses/9-00sc-introduction-to-psychology-fall-2011/"},
    {"title": "Sociology: Understanding Society", "description": "Introduction to sociological perspectives: functionalism, conflict theory, symbolic interactionism. Covers social stratification, race and ethnicity, gender, education, religion, and research methodology.", "type": "document", "category": "Sociology", "tags": ["sociology", "society", "social science", "culture"], "url": "https://ocw.mit.edu/courses/21a-00-introduction-to-anthropology-spring-2013/"},
    {"title": "Ethics in Technology", "description": "Explores ethical frameworks applied to technology: AI bias, privacy, surveillance, digital divide, autonomous weapons, algorithmic fairness, data ethics, and responsible innovation. Case studies from real-world tech companies.", "type": "article", "category": "Philosophy", "tags": ["ethics", "technology", "AI", "privacy"], "url": "https://ocw.mit.edu/courses/24-131-ethics-of-technology-spring-2023/"},

    # ── Engineering ──
    {"title": "Advanced Mathematics for Engineers", "description": "Engineering math course covering differential equations (ODEs, PDEs), Fourier analysis, Laplace transforms, numerical methods (Euler, Runge-Kutta), complex analysis, and linear programming.", "type": "course", "category": "Engineering", "tags": ["math", "engineering", "differential equations", "Fourier"], "url": "https://ocw.mit.edu/courses/18-03-differential-equations-spring-2010/"},
    {"title": "Robotics 101", "description": "Introduction to robotics covering kinematics, dynamics, sensors (LIDAR, cameras), actuators, path planning algorithms, PID control, computer vision for robots, and ROS (Robot Operating System).", "type": "course", "category": "Engineering", "tags": ["robotics", "engineering", "automation", "sensors"], "url": "https://ocw.mit.edu/courses/6-832-underactuated-robotics-spring-2009/"},
    {"title": "Digital Signal Processing", "description": "Covers discrete-time signals and systems, Z-transform, DFT, FFT, filter design (FIR, IIR), spectral analysis, and applications in audio processing, image processing, and telecommunications.", "type": "course", "category": "Engineering", "tags": ["DSP", "signals", "engineering", "Fourier"], "url": "https://ocw.mit.edu/courses/6-341-discrete-time-signal-processing-fall-2005/"},
    {"title": "Renewable Energy Technologies", "description": "Analysis of solar photovoltaics, wind turbines, hydroelectric power, geothermal energy, biomass, fuel cells, energy storage systems, smart grids, and life-cycle assessment of energy technologies.", "type": "article", "category": "Engineering", "tags": ["energy", "renewable", "engineering", "solar"], "url": "https://ocw.mit.edu/courses/22-081j-introduction-to-sustainable-energy-fall-2010/"},

    # ── Video Lectures ──
    {"title": "Python for Data Science - Lecture Series", "description": "Complete lecture series covering Python fundamentals for data science. Topics include NumPy arrays, Pandas DataFrames, Matplotlib/Seaborn visualization, statistical analysis, and introductory machine learning with scikit-learn.", "type": "video", "category": "Computer Science", "tags": ["python", "data science", "video lecture", "pandas"], "url": "https://www.youtube.com/playlist?list=PLQVvvaa0QuDfKTOs3Keq_kaG2P55YRn5v"},
    {"title": "Physics Lab Demonstrations", "description": "Video demonstrations of key physics experiments including pendulum motion, wave interference, electromagnetic induction, photoelectric effect, and Rutherford scattering. High-quality visualizations with explanations.", "type": "video", "category": "Physics", "tags": ["physics", "lab", "demonstration", "experiments"], "url": "https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/pages/syllabus/"},
    {"title": "Effective Study Techniques", "description": "Expert-led workshop on effective study strategies including spaced repetition, active recall, mind mapping, Pomodoro technique, Cornell note-taking, Feynman technique, and evidence-based time management.", "type": "video", "category": "General", "tags": ["study tips", "productivity", "learning", "techniques"], "url": "https://www.khanacademy.org/college-careers-more/learnstorm-growth-mindset-activities-us"},
    {"title": "History of Modern Computing", "description": "Documentary-style lecture tracing the evolution of computing from Babbage's engine and Turing machines to transistors, integrated circuits, personal computers, the internet, and modern AI systems.", "type": "video", "category": "Computer Science", "tags": ["history", "computing", "technology", "Turing"], "url": "https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/"},
    {"title": "Statistics Crash Course", "description": "Quick video tutorial covering probability distributions, hypothesis testing (t-test, chi-square, ANOVA), confidence intervals, regression analysis, correlation, Bayesian statistics, and experimental design.", "type": "video", "category": "Mathematics", "tags": ["statistics", "math", "tutorial", "hypothesis testing"], "url": "https://www.khanacademy.org/math/statistics-probability"},
    {"title": "JavaScript Masterclass", "description": "In-depth video tutorial on modern JavaScript: ES6+ features, closures, prototypes, async/await, promises, Web APIs, DOM manipulation, modules, TypeScript basics, and Node.js fundamentals.", "type": "video", "category": "Computer Science", "tags": ["javascript", "programming", "web", "ES6"], "url": "https://www.youtube.com/playlist?list=PL0vfts4VzfNixzfaQWwDUg3W5TRbE7CyI"},
    {"title": "Deep Learning Foundations", "description": "Video lecture series on neural network architectures: perceptrons, CNNs, RNNs, LSTMs, Transformers, attention mechanisms, GANs, and practical training with PyTorch. Covers backpropagation and gradient descent.", "type": "video", "category": "Computer Science", "tags": ["deep learning", "neural networks", "AI", "PyTorch"], "url": "https://ocw.mit.edu/courses/6-s191-introduction-to-deep-learning-january-iap-2023/"},

    # ── Full Courses ──
    {"title": "Full Stack Web Development", "description": "Complete course covering frontend (React, CSS, responsive design), backend (Node.js, Express, REST APIs), databases (PostgreSQL, MongoDB), authentication (JWT, OAuth), deployment (Docker, AWS, Vercel), and CI/CD.", "type": "course", "category": "Computer Science", "tags": ["web development", "full stack", "programming", "React"], "url": "https://fullstackopen.com/en/"},
    {"title": "Introduction to Biology", "description": "Freshman biology course covering cell biology, genetics, evolution, ecology, biodiversity, and human physiology. Includes virtual lab simulations, case studies, and research paper analysis.", "type": "course", "category": "Biology", "tags": ["biology", "genetics", "ecology", "evolution"], "url": "https://ocw.mit.edu/courses/7-013-introductory-biology-spring-2018/"},
    {"title": "Creative Writing Workshop", "description": "Interactive writing course with peer review sessions, covering fiction (short stories, novel structure), poetry (forms, free verse), non-fiction (essays, memoirs), screenwriting basics, and publishing guidance.", "type": "course", "category": "English", "tags": ["writing", "creative", "workshop", "fiction"], "url": "https://ocw.mit.edu/courses/21w-755-writing-and-reading-short-stories-spring-2012/"},
    {"title": "Art History Survey", "description": "Survey of art from prehistoric cave paintings to contemporary art. Covers Renaissance, Baroque, Impressionism, Cubism, Surrealism, Pop Art, and digital art. Museum visit virtual field trips included.", "type": "course", "category": "Art", "tags": ["art", "history", "culture", "Renaissance"], "url": "https://ocw.mit.edu/courses/4-602-modern-art-and-mass-culture-spring-2012/"},
    {"title": "Bioinformatics Introduction", "description": "Course covering DNA/protein sequence analysis, BLAST, multiple sequence alignment, phylogenetics, gene prediction, genome assembly, metagenomics, and machine learning in bioinformatics.", "type": "course", "category": "Biology", "tags": ["bioinformatics", "biology", "computing", "genomics"], "url": "https://ocw.mit.edu/courses/7-91j-foundations-of-computational-and-systems-biology-spring-2014/"},
    {"title": "Data Science with R", "description": "Comprehensive R programming course for data science: data wrangling (tidyverse), statistical modeling, machine learning (caret, tidymodels), data visualization (ggplot2), and reproducible research (R Markdown).", "type": "course", "category": "Computer Science", "tags": ["R", "data science", "statistics", "ggplot2"], "url": "https://ocw.mit.edu/courses/15-071-the-analytics-edge-spring-2017/"},
    {"title": "Cloud Computing Architecture", "description": "Course on cloud platforms (AWS, Azure, GCP), microservices, containers (Docker, Kubernetes), serverless computing, distributed systems, load balancing, auto-scaling, and cloud security best practices.", "type": "course", "category": "Computer Science", "tags": ["cloud", "AWS", "architecture", "Docker"], "url": "https://ocw.mit.edu/courses/6-824-distributed-computer-systems-engineering-spring-2006/"},

    # ── Articles ──
    {"title": "The Future of AI in Education", "description": "Research article exploring how artificial intelligence is transforming educational institutions. Covers adaptive learning systems, automated grading, intelligent tutoring systems, learning analytics, and natural language processing for automated feedback.", "type": "article", "category": "Computer Science", "tags": ["AI", "education", "research", "adaptive learning"], "url": "https://arxiv.org/abs/2305.18290"},
    {"title": "Climate Change: A Scientific Overview", "description": "Peer-reviewed article summarizing current climate science, including greenhouse gas effects, sea level predictions, extreme weather events, carbon capture technology, and mitigation strategies (Paris Agreement goals).", "type": "article", "category": "Environmental Science", "tags": ["climate", "environment", "science", "carbon"], "url": "https://climate.nasa.gov/evidence/"},
    {"title": "Mental Health in Academic Settings", "description": "Article discussing mental health challenges faced by students and faculty, with evidence-based strategies for maintaining wellbeing. Covers anxiety, depression, burnout prevention, mindfulness, and institutional support systems.", "type": "article", "category": "General", "tags": ["mental health", "wellness", "academic", "stress"], "url": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6352425/"},
    {"title": "Blockchain in Supply Chain Management", "description": "Analysis of distributed ledger technology applications in supply chain transparency, traceability, smart contracts, decentralized finance, and efficiency optimization. Case studies from Walmart, IBM Food Trust, and Maersk.", "type": "article", "category": "Business", "tags": ["blockchain", "supply chain", "technology", "smart contracts"], "url": "https://arxiv.org/abs/1901.04985"},
    {"title": "Game Theory Applications", "description": "Mathematical game theory applications in economics, politics, biology, and computer science. Covers Nash equilibrium, prisoner's dilemma, auction theory, mechanism design, and evolutionary game theory.", "type": "article", "category": "Mathematics", "tags": ["game theory", "economics", "math", "Nash equilibrium"], "url": "https://ocw.mit.edu/courses/14-12-economic-applications-of-game-theory-fall-2012/"},
    {"title": "Quantum Computing: State of the Art", "description": "Survey of quantum computing technologies: qubits, quantum gates, quantum algorithms (Shor's, Grover's), quantum error correction, current hardware (IBM, Google, IonQ), and potential applications in drug discovery and optimization.", "type": "article", "category": "Computer Science", "tags": ["quantum computing", "qubits", "algorithms", "IBM"], "url": "https://arxiv.org/abs/1801.00862"},
    {"title": "Natural Language Processing Survey", "description": "Comprehensive survey of NLP: tokenization, word embeddings (Word2Vec, GloVe), transformers, BERT, GPT models, sentiment analysis, named entity recognition, machine translation, and question answering systems.", "type": "article", "category": "Computer Science", "tags": ["NLP", "AI", "transformers", "BERT"], "url": "https://arxiv.org/abs/2003.08271"},

    # ── Presentations ──
    {"title": "Machine Learning Project Showcase", "description": "Student presentation showcasing ML projects including image classification with CNNs, sentiment analysis with transformers, recommendation systems with collaborative filtering, and reinforcement learning game AI.", "type": "presentation", "category": "Computer Science", "tags": ["machine learning", "projects", "showcase", "CNN"], "url": ""},
    {"title": "Campus Sustainability Report 2024", "description": "Annual sustainability report with data visualizations showing energy usage trends, waste reduction metrics, carbon footprint per capita, water conservation results, and green building certifications achieved.", "type": "presentation", "category": "Administration", "tags": ["sustainability", "campus", "report", "green"], "url": ""},
    {"title": "Research Symposium Proceedings", "description": "Collection of presentation slides from the annual research symposium covering topics across all departments. Highlights include breakthrough findings in materials science, computational biology, and social network analysis.", "type": "presentation", "category": "General", "tags": ["research", "symposium", "presentations", "interdisciplinary"], "url": ""},
    {"title": "Python Web Scraping Tutorial", "description": "Practical guide to web scraping with Python: requests library, BeautifulSoup, Selenium for dynamic content, Scrapy framework, handling pagination, ethics and robots.txt compliance, and data storage with pandas.", "type": "video", "category": "Computer Science", "tags": ["python", "web scraping", "automation", "BeautifulSoup"], "url": "https://www.youtube.com/playlist?list=PL-osiE80TeTt2d9bfVyTiXJA-UTHn6WwU"},

    # ── Additional Resources ──
    {"title": "Research Methodology Guide", "description": "A comprehensive guide to research methods including qualitative methods (interviews, focus groups, ethnography), quantitative methods (surveys, experiments, statistical analysis), and mixed methods approaches for academic research.", "type": "document", "category": "General", "tags": ["research", "methodology", "academic", "qualitative"], "url": "https://owl.purdue.edu/owl/research_and_citation/resources.html"},
    {"title": "Microeconomics Primer", "description": "Introduction to supply and demand, market equilibrium, consumer theory, producer theory, market structures (perfect competition, monopoly, oligopoly), externalities, and public goods.", "type": "document", "category": "Economics", "tags": ["economics", "microeconomics", "markets", "supply and demand"], "url": "https://ocw.mit.edu/courses/14-01-principles-of-microeconomics-fall-2018/"},
    {"title": "Political Science: Democracy and Governance", "description": "Study of political systems, democratic theory, electoral systems, separation of powers, constitutional law, political parties, international relations, and comparative politics across different nations.", "type": "document", "category": "Political Science", "tags": ["politics", "democracy", "governance", "law"], "url": "https://ocw.mit.edu/courses/17-20-introduction-to-american-politics-spring-2013/"},
    {"title": "Machine Learning with TensorFlow", "description": "Hands-on course building ML models with TensorFlow/Keras: neural networks, image recognition, text generation, time series forecasting, transfer learning, model deployment, and TensorBoard visualization.", "type": "course", "category": "Computer Science", "tags": ["TensorFlow", "machine learning", "deep learning", "Keras"], "url": "https://www.tensorflow.org/tutorials"},
    {"title": "Cybersecurity Capture the Flag Guide", "description": "Practical guide to CTF competitions: web exploitation, binary exploitation, reverse engineering, cryptography challenges, forensics, steganography, and network analysis. Includes practice platforms and tools.", "type": "document", "category": "Computer Science", "tags": ["cybersecurity", "CTF", "hacking", "forensics"], "url": "https://picoctf.org/"},
    {"title": "Introduction to Philosophy of Mind", "description": "Explores consciousness, mental states, mind-body problem, functionalism, artificial intelligence and consciousness, free will, personal identity, and the philosophical implications of neuroscience.", "type": "document", "category": "Philosophy", "tags": ["philosophy", "mind", "consciousness", "AI"], "url": "https://ocw.mit.edu/courses/24-09-minds-and-machines-fall-2011/"},
    {"title": "Network Security Fundamentals", "description": "Guide to network security: firewalls, IDS/IPS, VLANs, network segmentation, SSL/TLS, certificate management, penetration testing methodology, security audit procedures, and incident response planning.", "type": "document", "category": "Computer Science", "tags": ["security", "networking", "firewall", "penetration testing"], "url": "https://ocw.mit.edu/courses/6-858-computer-systems-security-fall-2014/"},
]

# ─── Badges ───
BADGE_DEFINITIONS = [
    {"name": "Knowledge Contributor", "description": "Upload 5 pieces of content", "icon": "upload", "color": "#6366f1", "action": "upload", "count": 5, "points": 50, "rarity": "uncommon"},
    {"name": "Curious Explorer", "description": "View 20 different resources", "icon": "eye", "color": "#06b6d4", "action": "view", "count": 20, "points": 30, "rarity": "common"},
    {"name": "Search Master", "description": "Perform 15 searches", "icon": "search", "color": "#f59e0b", "action": "search", "count": 15, "points": 25, "rarity": "common"},
    {"name": "Helpful Peer", "description": "Upvote 10 resources", "icon": "thumbs-up", "color": "#10b981", "action": "upvote", "count": 10, "points": 35, "rarity": "uncommon"},
    {"name": "Early Adopter", "description": "Log in for 7 consecutive days", "icon": "zap", "color": "#f43f5e", "action": "login", "count": 7, "points": 40, "rarity": "rare"},
    {"name": "AI Pioneer", "description": "Ask EduBot 10 questions", "icon": "bot", "color": "#8b5cf6", "action": "chat", "count": 10, "points": 45, "rarity": "uncommon"},
    {"name": "Content King", "description": "Upload 25 pieces of content", "icon": "crown", "color": "#eab308", "action": "upload", "count": 25, "points": 100, "rarity": "epic"},
    {"name": "Scholar", "description": "View 100 resources", "icon": "book-open", "color": "#3b82f6", "action": "view", "count": 100, "points": 75, "rarity": "rare"},
    {"name": "Community Star", "description": "Upvote 50 resources", "icon": "star", "color": "#f97316", "action": "upvote", "count": 50, "points": 80, "rarity": "epic"},
    {"name": "First Steps", "description": "Upload your first content", "icon": "footprints", "color": "#84cc16", "action": "upload", "count": 1, "points": 10, "rarity": "common"},
    {"name": "Question Asker", "description": "Ask EduBot 3 questions", "icon": "message-circle", "color": "#a855f7", "action": "chat", "count": 3, "points": 15, "rarity": "common"},
    {"name": "Researcher", "description": "Perform 50 searches", "icon": "microscope", "color": "#14b8a6", "action": "search", "count": 50, "points": 60, "rarity": "rare"},
    {"name": "Download Champion", "description": "Download 20 resources", "icon": "download", "color": "#ec4899", "action": "download", "count": 20, "points": 40, "rarity": "uncommon"},
    {"name": "Bookworm", "description": "View 50 resources", "icon": "book", "color": "#6d28d9", "action": "view", "count": 50, "points": 55, "rarity": "uncommon"},
]


SEARCH_QUERIES = [
    "machine learning", "calculus exam prep", "python tutorial", "data structures",
    "quantum mechanics", "writing guide", "statistics", "biology lab",
    "web development", "history", "physics experiments", "study tips",
    "research methods", "chemistry", "algorithms", "exam preparation",
    "linear algebra", "programming", "AI education", "sustainability",
    "midterm preparation", "finals study guide", "course registration",
    "library hours", "lab schedule", "deep learning", "database design",
    "cybersecurity", "operating systems", "natural language processing",
    "computer networks", "software engineering", "robotics", "climate change",
]


def seed_database(db: Session):
    """Populate the database with demo data."""
    # Check if already seeded
    if db.query(User).count() > 0:
        return

    print("🌱 Seeding database with demo data...")

    # Create users
    users = []
    for u in DEMO_USERS:
        user = User(
            id=str(uuid.uuid4()),
            username=u["username"],
            email=u["email"],
            hashed_password=hash_password("password123"),
            full_name=u["full_name"],
            role=u["role"],
            department=u["department"],
            interests=u["interests"],
            reputation_score=random.randint(10, 500),
            streak_days=random.randint(0, 30),
            last_active=datetime.utcnow() - timedelta(hours=random.randint(0, 48)),
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 90)),
        )
        db.add(user)
        users.append(user)

    db.flush()
    print(f"  ✅ Created {len(users)} users")

    # Create content
    contents = []
    for ct in CONTENT_TEMPLATES:
        author = random.choice([u for u in users if u.role in ("faculty", "staff", "student")])
        content = Content(
            id=str(uuid.uuid4()),
            title=ct["title"],
            description=ct["description"],
            content_type=ct["type"],
            category=ct["category"],
            tags=ct["tags"],
            source_system=random.choice(["internal", "lms", "library", "google_drive", "open_access"]),
            file_url=ct.get("url", ""),
            author_id=author.id,
            views=random.randint(5, 500),
            upvotes=random.randint(0, 50),
            downloads=random.randint(0, 100),
            version=random.randint(1, 3),
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 60)),
            updated_at=datetime.utcnow() - timedelta(days=random.randint(0, 30)),
        )
        db.add(content)
        contents.append(content)

    db.flush()
    print(f"  ✅ Created {len(contents)} content items")

    # Create badges
    badges = []
    for bd in BADGE_DEFINITIONS:
        badge = Badge(
            id=str(uuid.uuid4()),
            name=bd["name"],
            description=bd["description"],
            icon=bd["icon"],
            color=bd["color"],
            criteria_action=bd["action"],
            criteria_count=bd["count"],
            points_value=bd["points"],
            rarity=bd["rarity"],
        )
        db.add(badge)
        badges.append(badge)

    db.flush()
    print(f"  ✅ Created {len(badges)} badges")

    # Create interactions
    actions = ["view", "search", "download", "upvote", "upload", "chat", "login"]
    interactions = []
    for _ in range(2500):
        user = random.choice(users)
        content = random.choice(contents)
        action = random.choice(actions)
        interaction = Interaction(
            id=str(uuid.uuid4()),
            user_id=user.id,
            content_id=content.id if action != "search" else None,
            action=action,
            query=random.choice(SEARCH_QUERIES) if action == "search" else "",
            timestamp=datetime.utcnow() - timedelta(
                days=random.randint(0, 30),
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59),
            ),
        )
        db.add(interaction)
        interactions.append(interaction)

    print(f"  ✅ Created {len(interactions)} interactions")

    # Award some badges to users
    for user in users[:20]:
        num_badges = random.randint(1, 5)
        awarded = random.sample(badges, min(num_badges, len(badges)))
        for badge in awarded:
            ub = UserBadge(
                id=str(uuid.uuid4()),
                user_id=user.id,
                badge_id=badge.id,
                progress=1.0,
                earned_at=datetime.utcnow() - timedelta(days=random.randint(1, 30)),
            )
            db.add(ub)

    # Create search logs
    for _ in range(600):
        sl = SearchLog(
            id=str(uuid.uuid4()),
            query=random.choice(SEARCH_QUERIES),
            results_count=random.randint(0, 25),
            user_id=random.choice(users).id,
            timestamp=datetime.utcnow() - timedelta(
                days=random.randint(0, 14),
                hours=random.randint(0, 23),
            ),
        )
        db.add(sl)

    db.commit()
    print("🎉 Database seeded successfully!")
