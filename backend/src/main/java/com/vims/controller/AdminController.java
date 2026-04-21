package com.vims.controller;

import com.vims.dto.request.UserRequests.*;
import com.vims.dto.response.Responses.*;
import com.vims.enums.Role;
import com.vims.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class AdminController {

    private final UserService userService;

    @PostMapping("/users")
    public ResponseEntity<ApiResponse<UserDto>> createUser(@Valid @RequestBody CreateUserRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("User created", userService.createUser(req)));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserDto>>> getAllUsers() {
        return ResponseEntity.ok(ApiResponse.ok(userService.getAllUsers()));
    }

    @GetMapping("/users/role/{role}")
    public ResponseEntity<ApiResponse<List<UserDto>>> getUsersByRole(@PathVariable Role role) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getUsersByRole(role)));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<ApiResponse<UserDto>> updateUser(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(userService.updateUser(id, req)));
    }

    @PostMapping("/users/{id}/unlock")
    public ResponseEntity<ApiResponse<Void>> unlockUser(@PathVariable UUID id) {
        userService.unlockUser(id);
        return ResponseEntity.ok(ApiResponse.ok("User unlocked", null));
    }
}
