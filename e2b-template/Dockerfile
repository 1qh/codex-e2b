FROM e2bdev/code-interpreter:latest
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/home/user/.bun/bin:${PATH}"
RUN bun install -g @openai/codex
RUN cd /home/user && git init && git config user.email u@claw.dev && git config user.name claw
RUN echo 'export PATH="/home/user/.bun/bin:$PATH"' >> /home/user/.bashrc
