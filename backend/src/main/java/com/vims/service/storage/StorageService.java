package com.vims.service.storage;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

public interface StorageService {
    /** Saves the file and returns an opaque file reference (local path or cloud URL). */
    String save(MultipartFile file) throws IOException;

    /** Loads a file by its reference returned from {@link #save}. */
    Resource load(String fileRef) throws IOException;
}
