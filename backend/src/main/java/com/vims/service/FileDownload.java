package com.vims.service;

import org.springframework.core.io.Resource;

public record FileDownload(Resource resource, String filename) {}
